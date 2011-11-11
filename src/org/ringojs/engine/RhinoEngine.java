/*
 *  Copyright 2004 Hannes Wallnoefer <hannes@helma.at>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.ringojs.engine;

import org.mozilla.javascript.json.JsonParser;
import org.ringojs.repository.*;
import org.ringojs.tools.RingoDebugger;
import org.ringojs.tools.launcher.RingoClassLoader;
import org.ringojs.wrappers.*;
import org.mozilla.javascript.*;
import org.mozilla.javascript.tools.debugger.ScopeProvider;

import java.io.*;
import java.lang.reflect.InvocationTargetException;
import java.net.URL;
import java.net.MalformedURLException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingDeque;

/**
 * This class provides methods to create JavaScript objects
 * from JavaScript files.
 *
 * @author Hannes Wallnoefer <hannes@helma.at>
 */
public class RhinoEngine implements ScopeProvider {

    private RingoConfiguration config;
    private List<Repository> repositories;
    private RingoGlobal globalScope;
    private List<String> commandLineArgs;
    private Map<Trackable, ReloadableScript> compiledScripts, interpretedScripts;
    private final Map<String, Object> singletons;
    private AppClassLoader loader = new AppClassLoader();
    private WrapFactory wrapFactory;
    private Set<Class> hostClasses;

    private RingoContextFactory contextFactory = null;
    private ModuleScope mainScope = null;

    public static final Object[] EMPTY_ARGS = new Object[0];
    public static final List<Integer> VERSION =
            Collections.unmodifiableList(Arrays.asList(0, 8));

    private final RingoWorker mainWorker;
    private final ThreadLocal<RingoWorker> currentWorker = new ThreadLocal<RingoWorker>();
    private final Deque<RingoWorker> workers;

    /**
     * Create a RhinoEngine with the given configuration. If <code>globals</code>
     * is not null, its contents are added as properties on the global object.
     *
     * @param config the configuration used to initialize the engine.
     * @param globals an optional map of global properties
     * @throws Exception if the engine can't be created
     */
    public RhinoEngine(RingoConfiguration config, Map<String, Object> globals)
            throws Exception {
        this.config = config;
        workers = new LinkedBlockingDeque<RingoWorker>();
        mainWorker = new RingoWorker(this);
        compiledScripts = new ConcurrentHashMap<Trackable, ReloadableScript>();
        interpretedScripts = new ConcurrentHashMap<Trackable, ReloadableScript>();
        singletons = Collections.synchronizedMap(new HashMap<String, Object>());
        contextFactory = new RingoContextFactory(this, config);
        repositories = config.getRepositories();
        if (repositories.isEmpty()) {
            throw new IllegalArgumentException("Empty repository list");
        }
        this.wrapFactory = config.getWrapFactory();
        RingoDebugger debugger = null;
        if (config.getDebug()) {
            debugger = new RingoDebugger(config);
            debugger.setScopeProvider(this);
            debugger.attachTo(contextFactory);
            debugger.setBreakOnExceptions(true);
        }
        // create a new global scope level
        Context cx = contextFactory.enterContext();
        setCurrentWorker(mainWorker);
        try {
            boolean sealed = config.isSealed();
            globalScope = new RingoGlobal(cx, this, sealed);
            Class<Scriptable>[] classes = config.getHostClasses();
            if (classes != null) {
                for (Class<Scriptable> clazz: classes) {
                    defineHostClass(clazz);
                }
            }
            ScriptableList.init(globalScope);
            ScriptableMap.init(globalScope);
            ScriptableObject.defineClass(globalScope, ScriptableWrapper.class);
            ScriptableObject.defineClass(globalScope, ModuleObject.class);
            if (globals != null) {
                for (Map.Entry<String, Object> entry : globals.entrySet()) {
                    ScriptableObject.defineProperty(globalScope, entry.getKey(),
                            entry.getValue(), ScriptableObject.DONTENUM);
                }
            }
            mainWorker.evaluateScript(cx, getScript("ringo/global"), globalScope);
            evaluateBootstrapScripts(cx);
            if (sealed) {
                globalScope.sealObject();
            }
            if (debugger != null) {
                debugger.setBreak();
            }
        } finally {
            setCurrentWorker(null);
            Context.exit();
        }
    }

    /**
     * Define a Javascript host object implemented by the given class.
     * @param clazz The Java class implementing the host object.
     * @exception IllegalAccessException if access is not available
     *            to a reflected class member
     * @exception InstantiationException if unable to instantiate
     *            the named class
     * @exception InvocationTargetException if an exception is thrown
     *            during execution of methods of the named class
     */
    public void defineHostClass(Class<Scriptable> clazz)
            throws InvocationTargetException, InstantiationException, IllegalAccessException {
        if (hostClasses != null && hostClasses.contains(clazz)) {
            return;
        }
        synchronized (this) {
            if (hostClasses == null) {
                hostClasses = new HashSet<Class>();
            }
            hostClasses.add(clazz);
            ScriptableObject.defineClass(globalScope, clazz);
        }
    }

    /**
     * Invoke a script from the command line.
     * @param scriptResource the script resource of path
     * @param scriptArgs an array of command line arguments
     * @return the return value
     * @throws IOException an I/O related error occurred
     * @throws JavaScriptException the script threw an error during
     *         compilation or execution
     */
    public Object runScript(Object scriptResource, String... scriptArgs)
            throws IOException, JavaScriptException {
        Resource resource;
        if (scriptResource instanceof Resource) {
            resource = (Resource) scriptResource;
        } else if (scriptResource instanceof String) {
            resource = findResource((String) scriptResource, null);
        } else {
            throw new IOException("Unsupported script resource: " + scriptResource);
        }
        if (!resource.exists()) {
            throw new FileNotFoundException(scriptResource.toString());
        }
        Context cx = contextFactory.enterContext();
        setCurrentWorker(mainWorker);
        try {
            Object retval;
            Map<Trackable,ReloadableScript> scripts = getScriptCache(cx);
            commandLineArgs = Arrays.asList(scriptArgs);
            resource.setStripShebang(true);
            ReloadableScript script = new ReloadableScript(resource, this);
            scripts.put(resource, script);
            mainScope = new ModuleScope(resource.getModuleName(), resource, globalScope);
            retval = mainWorker.evaluateScript(cx, script, mainScope);
            mainScope.updateExports();
            return retval instanceof Wrapper ? ((Wrapper) retval).unwrap() : retval;
        } finally {
            setCurrentWorker(null);
            Context.exit();
        }
    }

    /**
     * Evaluate an expression from the command line.
     * @param expr the JavaScript expression to evaluate
     * @return the return value
     * @throws IOException an I/O related error occurred
     * @throws JavaScriptException the script threw an error during
     *         compilation or execution
     */
    public Object evaluateExpression(String expr)
            throws IOException, JavaScriptException {
        Context cx = contextFactory.enterContext();
        cx.setOptimizationLevel(-1);
        try {
            Object retval;
            Repository repository = repositories.get(0);
            Scriptable parentScope = mainScope != null ? mainScope : globalScope;
            ModuleScope scope = new ModuleScope("<expr>", repository, parentScope);
            retval = cx.evaluateString(scope, expr, "<expr>", 1, null);
            return retval instanceof Wrapper ? ((Wrapper) retval).unwrap() : retval;
        } finally {
            Context.exit();
        }
    }

    /**
     * Invoke a javascript function. This enters a JavaScript context, creates
     * a new per-thread scope, calls the function, exits the context and returns
     * the return value of the invocation.
     *
     * @param module the module name or object, or null for the main module
     * @param method the method name to call in the script
     * @param args the arguments to pass to the method
     * @return the return value of the invocation
     * @throws NoSuchMethodException the method is not defined
     * @throws IOException an I/O related error occurred
     */
    public Object invoke(Object module, String method, Object... args)
            throws IOException, NoSuchMethodException, ExecutionException,
                    InterruptedException {
        return mainWorker.invoke(module, method, args);
    }

    /**
     * Get the worker associated with the current thread, or null if no worker
     * is associated with the current thread.
     * @return the worker associated with the current thread, or null.
     */
    public RingoWorker getCurrentWorker() {
        RingoWorker worker = currentWorker.get();
        return worker == null ? mainWorker : worker;
    }

    protected void setCurrentWorker(RingoWorker worker) {
        if (worker == null) {
            currentWorker.remove();
        } else {
            currentWorker.set(worker);
        }
    }

    /**
     * Get a new {@link RingoWorker}.
     * @return a worker instance.
     */
    public RingoWorker getWorker() {
        RingoWorker worker = workers.pollFirst();
        if (worker == null) {
            worker = new RingoWorker(this);
        }
        return worker;
    }

    /**
     * Release a worker, returning it to the worker pool.
     * @param worker the worker to be released
     */
    public void releaseWorker(RingoWorker worker) {
        if (worker != null) {
            if (!workers.offerFirst(worker)) {
                worker.terminate();
            }
        }
    }

    /**
     * Get the list of errors encountered by the current worker.
     * @return a list of errors, may be null.
     */
    public List<SyntaxError> getErrorList() {
        RingoWorker worker = currentWorker.get();
        return worker != null ? worker.getErrors() : null;
    }

    /**
     * Return a shell scope for interactive evaluation
     * @return a shell scope
     * @throws IOException an I/O related exception occurred
     */
    public Scriptable getShellScope() throws IOException {
        Repository repository = new FileRepository("");
        repository.setAbsolute(true);
        Scriptable parentScope = mainScope != null ? mainScope : globalScope;
        return new ModuleScope("<shell>", repository, parentScope);
    }

    /**
     * Get the engine's global shared scope
     * @return the global scope
     */
    public Scriptable getScope() {
        return globalScope;
    }

    /**
     * Initialize and normalize the global variables and arguments on a thread scope.
     * @param args the arguments
     */
    protected void initArguments(Object[] args) {
        if (args != null) {
            for (int i = 0; i < args.length; i++) {
                args[i] = wrapArgument(args[i], globalScope);
            }
        }
    }

    /**
     * Prepare a single property or argument value for use within rhino.
     * @param value the property or argument value
     * @param scope the scope
     * @return the object wrapped and wired for rhino
     */
    public static Object wrapArgument(Object value, Scriptable scope) {
        if (value instanceof ScriptableObject) {
            ScriptableObject scriptable = ((ScriptableObject) value);
            // Avoid overwriting prototype and parent scope as this would break closures
            if (scriptable.getPrototype() == null) {
                scriptable.setPrototype(ScriptableObject.getClassPrototype(
                        scope, scriptable.getClassName()));
            }
            if (scriptable.getParentScope() == null) {
                scriptable.setParentScope(scope);
            }
            return scriptable;
        } else {
            return Context.javaToJS(value, scope);
        }
    }

    /**
     * Wait until all daemon threads running in this engine have terminated.
     * @throws InterruptedException if the current thread has been interrupted
     */
    public void waitTillDone() throws InterruptedException {
        globalScope.waitTillDone();
    }

    /**
     * Get the current Rhino optimization level
     * @return the current optimization level
     */
    public int getOptimizationLevel() {
        Context cx = Context.getCurrentContext();
        if (cx != null) {
            return cx.getOptimizationLevel();
        }
        return 0;
    }

    /**
     * Set Rhino optimization level
     * @param level the new optimization level
     */
    public void setOptimizationLevel(int level) {
        Context cx = Context.getCurrentContext();
        if (cx != null && cx.getOptimizationLevel() != level) {
            cx.setOptimizationLevel(level);
        }
    }

    /**
     * Resolves a type name to a script file within our script directory
     * and returns a Scriptable evaluated to the file.
     *
     * @param moduleName the name of the module to load
     * @return The raw compiled script for the module
     * @throws JavaScriptException if an error occurred evaluating the script file
     * @throws IOException if an error occurred reading the script file
     */
    public ReloadableScript getScript(String moduleName)
            throws JavaScriptException, IOException {
        return getScript(moduleName, null);
    }

    /**
     * Resolves a type name to a script file within our script directory
     * and returns a Scriptable evaluated to the file.
     *
     * @param moduleName the name of the module to load
     * @param localPath the path of the resource issuing this call
     * @return The raw compiled script for the module
     * @throws JavaScriptException if an error occurred evaluating the script file
     * @throws IOException if an error occurred reading the script file
     */
    public ReloadableScript getScript(String moduleName, Repository localPath)
            throws JavaScriptException, IOException {
        ReloadableScript script;
        Resource source = findResource(moduleName + ".js", localPath);
        if (!source.exists()) {
            source = loadPackage(moduleName, localPath);
            if (!source.exists()) {
                source = findResource(moduleName, localPath);
            }
        }
        Context cx = Context.getCurrentContext();
        Map<Trackable,ReloadableScript> scripts = getScriptCache(cx);
        if (scripts.containsKey(source)) {
            script = scripts.get(source);
        } else {
            script = new ReloadableScript(source, this);
            if (source.exists()) {
                scripts.put(source, script);
            }
        }
        return script;
    }

    /**
     * Resolves a module id to a package resource. If module id consists of
     * just one term and resolves to a package directory, the main module of
     * the package is returned. If the module id consists of several terms
     * and the first term resolves to a package directory, the remaining part
     * of the module id is resolved against the "lib" directory of the package.
     *
     * @link http://nodejs.org/docs/v0.4.4/api/modules.html#folders_as_Modules
     * @param moduleName the name of the package to load
     * @param localPath the path of the resource issuing this call
     * @return the location of the package's main module
     * @throws IOException an unrecoverable I/O exception occurred while
     * reading the package
     */
    protected Resource loadPackage(String moduleName, Repository localPath)
            throws IOException {

        int slash = 0;
        String packageName, remainingName;

        do {
            slash = moduleName.indexOf('/', slash + 1);
            if (slash == -1) {
                packageName = moduleName;
                remainingName = null;
            } else {
                packageName = moduleName.substring(0, slash);
                if (".".equals(packageName) || "..".equals(packageName))
                    continue;
                remainingName = moduleName.substring(slash + 1);
            }

            Resource json = findResource(packageName + "/package.json", localPath);

            if (json != null && json.exists()) {
                JsonParser parser = new JsonParser(
                        Context.getCurrentContext(), globalScope);
                try {
                    String moduleId = null;
                    Object parsed = parser.parseValue(json.getContent());
                    if (!(parsed instanceof NativeObject)) {
                        throw new RuntimeException(
                                "Expected Object from package.json, got " + parsed);
                    }
                    Scriptable obj = (Scriptable) parsed;

                    if (remainingName == null) {
                        // get the main module of this package
                        Object main = ScriptableObject.getProperty(obj, "main");
                        if (main != null && main != ScriptableObject.NOT_FOUND) {
                            moduleId = ScriptRuntime.toString(main);
                        }
                    } else {
                        // map remaining name to libs directory
                        String lib = "lib";
                        Object dirs = ScriptableObject.getProperty(obj, "directories");
                        if (dirs instanceof Scriptable) {
                            Object libDir = ScriptableObject.getProperty(
                                    (Scriptable) dirs, "lib");
                            if (libDir != null && libDir != Scriptable.NOT_FOUND) {
                                lib = ScriptRuntime.toString(libDir);
                            }
                        }
                        moduleId = lib + "/" + remainingName;
                    }

                    if (moduleId != null) {
                        Repository parent = json.getParentRepository();
                        Resource res = parent.getResource(moduleId);
                        if (res == null || !res.exists()) {
                            res = parent.getResource(moduleId + ".js");
                        }
                        return res;
                    }
                } catch (JsonParser.ParseException px) {
                    throw new RuntimeException(px);
                }
            }
        } while (slash != -1);

        return findResource(moduleName + "/index.js", localPath);
    }


    /**
     * Load a Javascript module into a module scope. This checks if the module has already
     * been loaded in the current context and if so returns the existing module scope.
     * @param cx the current context
     * @param moduleName the module name
     * @param loadingScope the scope requesting the module
     * @return the loaded module's scope
     * @throws IOException indicates that in input/output related error occurred
     */
    public ModuleScope loadModule(Context cx, String moduleName,
                                  Scriptable loadingScope)
            throws IOException {
        setCurrentWorker(mainWorker);
        try {
            return mainWorker.loadModule(cx, moduleName, loadingScope);
        } finally {
            setCurrentWorker(null);
        }
    }

    /**
     * Get the name of the main script as module name, if any
     * @return the main module name, or null
     */
    public String getMainModule() {
        return config.getMainModule();
    }

    /**
     * Get the main scrip's module scope, if any
     * @return the main module scope, or null
     */
    public ModuleScope getMainModuleScope() {
        return mainScope;
    }

    /**
     * Get the script arguments as object array suitable for use with Context.newArray().
     * @return the script arguments
     */
    public Object[] getArguments() {
        String[] args = config.getArguments();
        if (args == null) {
            return EMPTY_ARGS;
        } else {
            Object[] array = new Object[args.length];
            System.arraycopy(args, 0, array, 0, args.length);
            return array;
        }
    }

    public String getCharset() {
        return config.getCharset();
    }

    /**
     * Get the currently active RhinoEngine instance.
     * @param scope the global scope or a top level module scope
     * @return the current RhinoEngine
     */
    public static RhinoEngine getEngine(Scriptable scope) {
        if (scope instanceof ModuleScope) {
            scope = scope.getPrototype();
        }
        if (scope instanceof RingoGlobal) {
            return ((RingoGlobal) scope).getEngine();
        }
        throw new IllegalArgumentException("Unsupported scope");
    }

    /**
     * Create a sandboxed scripting engine with the same install directory as this and the
     * given module paths, global properties, class shutter and sealing
     * @param config the sandbox configuration
     * @param globals a map of predefined global properties, may be null
     * @return a sandboxed RhinoEngine instance
     * @throws FileNotFoundException if any part of the module paths does not exist
     */
    public RhinoEngine createSandbox(RingoConfiguration config, Map<String,Object> globals)
            throws Exception {
        config.setPolicyEnabled(this.config.isPolicyEnabled());
        return new RhinoEngine(config, globals);
    }

    protected boolean isPolicyEnabled() {
        // only use security when ringo runs standalone with default security manager,
        // not with google app engine
        return config.isPolicyEnabled();
    }

    protected void increaseAsyncCount() {
        globalScope.increaseAsyncCount();
    }

    protected void decreaseAsyncCount() {
        globalScope.decreaseAsyncCount();
    }

    private Map<Trackable,ReloadableScript> getScriptCache(Context cx) {
        return cx.getOptimizationLevel() == -1 ?
                interpretedScripts : compiledScripts;
    }

    private void evaluateBootstrapScripts(Context cx)
            throws IOException {
        List<String> bootstrapScripts = config.getBootstrapScripts();
        if (bootstrapScripts != null) {
            for(String script : bootstrapScripts) {
                Resource resource = new FileResource(script);
                // not found, attempt to resolve the file relative to ringo home
                if (!resource.exists()) {
                    resource = getRingoHome().getResource(script);
                }
                if (resource == null || !resource.exists()) {
                    throw new FileNotFoundException(
                            "Bootstrap script " + script + " not found");
                }
                mainWorker.evaluateScript(cx, new ReloadableScript(resource, this),
                        globalScope);
            }
        }
    }

    /**
     * Get the list of command line arguments
     * @return the command line arguments passed to this engine
     */
    public List<String> getCommandLineArguments() {
        if (commandLineArgs == null) {
            commandLineArgs = Collections.emptyList();
        }
        return Collections.unmodifiableList(commandLineArgs);
    }

    /**
     * Get the engine's module search path as a list of repositories
     * @return the module repositories
     */
    public List<Repository> getRepositories() {
        return repositories;
    }

    /**
     * Get the our installation directory.
     * @return the RingoJS installation directory
     */
    public Repository getRingoHome() {
        return config.getRingoHome();
    }

    /**
     * Get the repository associated with the scope or one of its prototypes
     *
     * @param scope the scope to get the repository from
     * @return the repository, or null
     */
    public Repository getParentRepository(Scriptable scope) {
        while (scope != null) {
            if (scope instanceof ModuleScope) {
                return ((ModuleScope) scope).getRepository();
            }
            scope = scope.getPrototype();
        }
        return null;
    }

    /**
     * Get a list of all child resources for the given path relative to
     * our script repository.
     * @param path the repository path
     * @param recursive whether to include nested resources
     * @return a list of all contained child resources
     */
    public List<Resource> findResources(String path, boolean recursive) throws IOException {
        return config.getResources(path, recursive);
    }

    /**
     * Try to resolve path to a resource or repository relative to a local path,
     * or the engine's repository path.
     * @param path the resource name
     * @param localRoot a repository to look first
     * @return the resource or repository
     * @throws IOException if an I/O error occurred
     */
    public Trackable resolve(String path, Repository localRoot) throws IOException {
        Trackable t = findResource(path, localRoot);
        if (t == null || !t.exists()) {
            t = findRepository(path, localRoot);
        }
        return t;
    }

    /**
     * Search for a resource in a local path, or the main repository path.
     * @param path the resource name
     * @param localRoot a repository to look first
     * @return the resource
     * @throws IOException if an I/O error occurred
     */
    public Resource findResource(String path, Repository localRoot)
            throws IOException {
        // Note: as an extension to the securable modules API
        // we allow absolute module paths for resources
        File file = new File(path);
        if (file.isAbsolute()) {
            Resource res = new FileResource(file);
            res.setAbsolute(true);
            return res;
        } else if (localRoot != null
                && (path.startsWith("./") || path.startsWith("../"))) {
            return findResource(localRoot.getRelativePath() + path, null);
        } else {
            return config.getResource(normalizePath(path));
        }
    }

    /**
     * Search for a repository in the local path, or the main repository path.
     * @param path the repository name
     * @param localPath a repository to look first
     * @return the repository
     * @throws IOException if an I/O error occurred
     */
    public Repository findRepository(String path, Repository localPath) throws IOException {
        // To be consistent, always return absolute repository if path is absolute
        // if we make this dependent on whether files exist we introduce a lot of
        // vague and undetermined behaviour.
        File file = new File(path);
        if (file.isAbsolute()) {
            return new FileRepository(file);
        }
        if (localPath != null) {
            Repository repository = localPath.getChildRepository(path);
            if (repository != null && repository.exists()) {
                return repository;
            }
        }
        return config.getRepository(normalizePath(path));
    }

    public static String normalizePath(String path) {
        if (!path.contains("./")) {
            return path;
        }
        boolean absolute = path.startsWith("/");
        String[] elements = path.split(Repository.SEPARATOR);
        LinkedList<String> list = new LinkedList<String>();
        for (String e : elements) {
            if ("..".equals(e)) {
                if (list.isEmpty() || "..".equals(list.getLast())) {
                    list.add(e);
                } else {
                    list.removeLast();
                }
            } else if (!".".equals(e) && e.length() > 0) {
                list.add(e);
            }
        }
        StringBuilder sb = new StringBuilder(path.length());
        if (absolute) {
            sb.append("/");
        }
        int count = 0, last = list.size() - 1;
        for (String e : list) {
            sb.append(e);
            if (count++ < last)
                sb.append("/");
        }
        return sb.toString();
    }

    public void addToClasspath(Trackable path) throws MalformedURLException {
        loader.addURL(path.getUrl());
    }

    public RingoContextFactory getContextFactory() {
        return contextFactory;
    }

    public RingoClassLoader getClassLoader() {
        return loader;
    }

    public RingoConfiguration getConfig() {
        return config;
    }

    protected synchronized Object getSingleton(String key, Function factory,
                                               Scriptable thisObj) {
        if (singletons.containsKey(key)) {
            return singletons.get(key);
        } else if (factory == null) {
            return Undefined.instance;
        }
        Context cx = Context.getCurrentContext();
        Object value = factory.call(cx, globalScope, thisObj, ScriptRuntime.emptyArgs);
        singletons.put(key, value);
        return value;
    }

    /**
     * Get a wrapper for a string that exposes the java.lang.String methods to JavaScript
     * This is useful for accessing strings as java.lang.String without the cost of
     * creating a new instance.
     * @param object an object
     * @return the object converted to a string and wrapped as native java object
     */
    public Object asJavaString(Object object) {
        if (!(object instanceof String)) {
            object = object.toString();
        }
        Context cx = Context.getCurrentContext();
        return wrapFactory.wrapAsJavaObject(cx, globalScope, object, null);
    }

    /**
     * Get a wrapper for an object that exposes it as Java object to JavaScript.
     * @param object an object
     * @return the object wrapped as native java object
     */
    public Object asJavaObject(Object object) {
        if (object instanceof Wrapper) {
            object = ((Wrapper) object).unwrap();
        }
        Context cx = Context.getCurrentContext();
        return wrapFactory.wrapAsJavaObject(cx, globalScope, object, null);
    }

    /**
     * Get the engine's WrapFactory.
     * @return the engine's WrapFactory instance
     */
    public WrapFactory getWrapFactory() {
        return wrapFactory;
    }

}

class AppClassLoader extends RingoClassLoader {

    HashSet<URL> urls = new HashSet<URL>();

    public AppClassLoader() {
        super(new URL[0], RhinoEngine.class.getClassLoader());
    }

    /**
     * Overrides addURL to make it accessable to RingoGlobal.addToClasspath()
     * @param url the url to add to the classpath
     */
    protected synchronized void addURL(URL url) {
        if (!urls.contains(url)) {
            urls.add(url);
            super.addURL(url);
        }
    }
}


