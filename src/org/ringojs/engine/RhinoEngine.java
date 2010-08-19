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

import org.ringojs.repository.*;
import org.ringojs.tools.RingoConfiguration;
import org.ringojs.tools.RingoDebugger;
import org.ringojs.tools.launcher.RingoClassLoader;
import org.ringojs.util.*;
import org.ringojs.wrappers.*;
import org.mozilla.javascript.*;
import org.mozilla.javascript.tools.debugger.ScopeProvider;
import org.mozilla.javascript.serialize.ScriptableOutputStream;
import org.mozilla.javascript.serialize.ScriptableInputStream;

import java.io.*;
import java.lang.reflect.InvocationTargetException;
import java.net.URL;
import java.net.MalformedURLException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * This class provides methods to create JavaScript objects
 * from JavaScript files.
 *
 * @author Hannes Wallnoefer <hannes@helma.at>
 */
public class RhinoEngine implements ScopeProvider {

    private RingoConfiguration config;
    private List<Repository> repositories;
    private ScriptableObject globalScope;
    private List<String> commandLineArgs;
    private Map<Trackable, ReloadableScript> compiledScripts, interpretedScripts, sharedScripts;
    private AppClassLoader loader = new AppClassLoader();
    private RingoWrapFactory wrapFactory = new RingoWrapFactory();
    private Set<Class> hostClasses;

    private RingoContextFactory contextFactory = null;
    private ModuleScope mainScope = null;

    public static final Object[] EMPTY_ARGS = new Object[0];
    public static final List<Integer> VERSION = Collections.unmodifiableList(Arrays.asList(0, 5));

    public static final ThreadLocal<List<SyntaxError>> errors = new ThreadLocal<List<SyntaxError>>();
    static final ThreadLocal<RhinoEngine> engines = new ThreadLocal<RhinoEngine>();
    static final ThreadLocal<Map<Trackable, ModuleScope>>modules = new ThreadLocal<Map<Trackable, ModuleScope>>();
    static final ThreadLocal<ReloadableScript>currentScripts = new ThreadLocal<ReloadableScript>();

    private Logger log = Logger.getLogger("org.ringojs.engine.RhinoEngine");

    /**
     * Create a RhinoEngine which loads scripts from directory <code>dir</code>
     * and defines the given classes as native host objects.
     * @param config the configuration used to initialize the engine.
     * @param globals an optional map of predefined global properties
     * @throws Exception if the engine can't be created
     */
    public RhinoEngine(RingoConfiguration config, Map<String, Object> globals)
            throws Exception {
        this.config = config;
        this.compiledScripts = new ConcurrentHashMap<Trackable, ReloadableScript>();
        this.interpretedScripts = new ConcurrentHashMap<Trackable, ReloadableScript>();
        this.sharedScripts = new ConcurrentHashMap<Trackable, ReloadableScript>();
        this.contextFactory = new RingoContextFactory(this, config);
        this.repositories = config.getRepositories();
        if (repositories.isEmpty()) {
            throw new IllegalArgumentException("Empty repository list");
        }
        RingoDebugger debugger = null;
        if (config.getDebug()) {
            debugger = new RingoDebugger(config);
            debugger.setScopeProvider(this);
            debugger.attachTo(contextFactory);
            debugger.setBreakOnExceptions(true);
        }
        // create a new global scope level
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals();
        try {
            boolean sealed = config.isSealed();
            globalScope = new RingoGlobal(cx, this, sealed);
            Class[] classes = config.getHostClasses();
            if (classes != null) {
                for (Class clazz: classes) {
                    defineHostClass(clazz);
                }
            }
            ScriptableList.init(globalScope);
            ScriptableMap.init(globalScope);
            ScriptableObject.defineClass(globalScope, ScriptableWrapper.class);
            if (globals != null) {
                for (Map.Entry<String, Object> entry : globals.entrySet()) {
                    ScriptableObject.defineProperty(globalScope, entry.getKey(),
                            entry.getValue(), ScriptableObject.DONTENUM);
                }
            }
            evaluateScript(cx, getScript("ringo/global"), globalScope);
            List<String> bootstrapScripts = config.getBootstrapScripts();
            if (bootstrapScripts != null) {
                for(String script : bootstrapScripts) {
                    Resource resource = new FileResource(script);
                    evaluateScript(cx, new ReloadableScript(resource, this), globalScope);
                }
            }
            if (sealed) {
                globalScope.sealObject();
            }
            if (debugger != null) {
                debugger.setBreak();
            }
        } finally {
            Context.exit();
            resetThreadLocals(threadLocals);
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
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals();
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
        try {
            Object retval;
            Map<Trackable,ReloadableScript> scripts = getScriptCache(cx);
            commandLineArgs = Arrays.asList(scriptArgs);
            resource.setStripShebang(true);
            ReloadableScript script = new ReloadableScript(resource, this);
            scripts.put(resource, script);
            mainScope = new ModuleScope(resource.getModuleName(), resource, globalScope, cx);
            retval = evaluateScript(cx, script, mainScope);
            return retval instanceof Wrapper ? ((Wrapper) retval).unwrap() : retval;
        } finally {
            Context.exit();
            resetThreadLocals(threadLocals);
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
        Object[] threadLocals = checkThreadLocals();
        cx.setOptimizationLevel(-1);
        try {
            Object retval;
            Repository repository = repositories.get(0);
            Scriptable parentScope = mainScope != null ? mainScope : globalScope;
            ModuleScope scope = new ModuleScope("<expr>", repository, parentScope, cx);
            retval = cx.evaluateString(scope, expr, "<expr>", 1, null);
            return retval instanceof Wrapper ? ((Wrapper) retval).unwrap() : retval;
        } finally {
            Context.exit();
            resetThreadLocals(threadLocals);
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
            throws IOException, NoSuchMethodException {
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals();
        try {
            initArguments(args);
            if (!(module instanceof String) && !(module instanceof Scriptable)) {
                throw new IllegalArgumentException("module argument must be a Scriptable or String object");
            }
            Object retval;
            while (true) {
                try {
                    Scriptable scriptable = module instanceof Scriptable ?
                            (Scriptable) module : loadModule(cx, (String) module, null);
                    Object function = ScriptableObject.getProperty(scriptable, method);
                    if (!(function instanceof Function)) {
                        throw new NoSuchMethodException("Function " + method + " not defined");
                    }
                    retval = ((Function) function).call(cx, globalScope, scriptable, args);
                    break;
                } catch (JavaScriptException jsx) {
                    Scriptable thrown = jsx.getValue() instanceof Scriptable ?
                            (Scriptable) jsx.getValue() : null;
                    if (thrown != null && thrown.get("retry", thrown) == Boolean.TRUE) {
                        modules.get().clear();
                    } else {
                        throw jsx;
                    }
                } catch (RetryException retry) {
                    // request to try again
                    modules.get().clear();
                }
            }
            if (retval instanceof Wrapper) {
                return ((Wrapper) retval).unwrap();
            }
            return retval;
        } finally {
            Context.exit();
            resetThreadLocals(threadLocals);
        }
    }

    // TODO is this still used or needed?
    public Object invoke(Callable callable, Object... args)
            throws IOException, NoSuchMethodException {
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals();
        try {
            initArguments(args);
            Object retval;
            while (true) {
                try {
                    retval = callable.call(cx, globalScope, null, args);
                    break;
                } catch (JavaScriptException jsx) {
                    Scriptable thrown = jsx.getValue() instanceof Scriptable ?
                            (Scriptable) jsx.getValue() : null;
                    if (thrown != null && thrown.get("retry", thrown) == Boolean.TRUE) {
                        modules.get().clear();
                    } else {
                        throw jsx;
                    }
                } catch (RetryException retry) {
                    // request to try again
                    modules.get().clear();
                }
            }
            if (retval instanceof Wrapper) {
                return ((Wrapper) retval).unwrap();
            }
            return retval;
        } finally {
            Context.exit();
            resetThreadLocals(threadLocals);
        }
    }

    /**
     * Return a shell scope for interactive evaluation
     * @return a shell scope
     * @throws IOException an I/O related exception occurred
     */
    public Scriptable getShellScope() throws IOException {
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals();
        try {
            Repository repository = repositories.get(0);
            Scriptable parentScope = mainScope != null ? mainScope : globalScope;
            ModuleScope scope = new ModuleScope("<shell>", repository, parentScope, cx);
            try {
                evaluateScript(cx, getScript("ringo/shell"), scope);
            } catch (Exception x) {
                log.log(Level.SEVERE, "Warning: couldn't load module 'ringo/shell'", x);
            }
            return scope;
        } finally {
            Context.exit();
            resetThreadLocals(threadLocals);
        }
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
        Context cx = Context.getCurrentContext();
        Map<Trackable,ReloadableScript> scripts = getScriptCache(cx);
        ReloadableScript script;
        Trackable source;
        boolean isWildcard = moduleName.endsWith(".*");
        if (isWildcard) {
            String repositoryName = moduleName
                    .substring(0, moduleName.length() - 2);
            source = findRepository(repositoryName, localPath);
        } else {
            source = findResource(moduleName + ".js", localPath);
            if (!source.exists()) {
                source = findResource(moduleName, localPath);
            }
        }
        if (scripts.containsKey(source)) {
            script = scripts.get(source);
        } else if (sharedScripts.containsKey(source)) {
            script = sharedScripts.get(source);
        } else {
            script = new ReloadableScript(source, this);
            if (source.exists()) {
                scripts.put(source, script);
            }
        }
        return script;
    }

    /**
     * Evaluate a script within a given scope.
     * @param cx the current context
     * @param script the script
     * @param scope the scope
     * @return the value returned by the script
     * @throws IOException an I/O related error occurred
     */
    protected Object evaluateScript(Context cx, ReloadableScript script, Scriptable scope)
            throws IOException {
        Object result;
        ReloadableScript parent = currentScripts.get();
        try {
            currentScripts.set(script);
            result = script.evaluate(scope, cx);
        } finally {
            if (parent != null) {
                parent.addDependency(script);
            }
            currentScripts.set(parent);
        }
        return result;

    }

    /**
     * Load a Javascript module into a module scope. This checks if the module has already
     * been loaded in the current context and if so returns the existing module scope.
     * @param cx the current context
     * @param moduleName the module name
     * @param loadingScope the scope requesting the module
     * @return the loaded module scope
     * @throws IOException indicates that in input/output related error occurred
     */
    public ModuleScope loadModule(Context cx, String moduleName, Scriptable loadingScope)
            throws IOException {
        Repository local = getParentRepository(loadingScope);
        ReloadableScript script = getScript(moduleName, local);
        ModuleScope module;
        ReloadableScript parent = currentScripts.get();
        try {
            currentScripts.set(script);
            module = script.load(globalScope, cx);
        } finally {
            if (parent != null) {
                parent.addDependency(script);
            }
            currentScripts.set(parent);
        }
        return module;
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
     * @return the current RhinoEngine
     */
    public static RhinoEngine getEngine() {
        return engines.get();
    }

    /**
     * Create a sandboxed scripting engine with the same install directory as this and the
     * given module paths, global properties, class shutter and sealing
     * @param modulePath the comma separated module search path
     * @param globals a map of predefined global properties, may be null
     * @param shutter a Rhino class shutter, may be null
     * @param sealed if the global object should be sealed, defaults to false
     * @return a sandboxed RhinoEngine instance
     * @throws FileNotFoundException if any part of the module paths does not exist
     * TODO clean up signature (esp. includeSystemModules)
     */
    public RhinoEngine createSandbox(String[] modulePath, Map<String,Object> globals,
                                     boolean includeSystemModules, ClassShutter shutter,
                                     boolean sealed)
            throws Exception {
        String systemModules = includeSystemModules ? "modules" : null;
        RingoConfiguration sandbox = new RingoConfiguration(getRingoHome(), modulePath, systemModules);
        sandbox.setClassShutter(shutter);
        sandbox.setSealed(sealed);
        sandbox.setPolicyEnabled(config.isPolicyEnabled());
        return new RhinoEngine(sandbox, globals);
    }

    protected boolean isPolicyEnabled() {
        // only use security when ringo runs standalone with default security manager,
        // not with google app engine
        return config.isPolicyEnabled();
    }

    protected void registerSharedScript(Trackable resource, ReloadableScript script) {
        sharedScripts.put(resource, script);
    }

    protected void removeSharedScript(Trackable resource) {
        if (sharedScripts.containsKey(resource)) {
            sharedScripts.remove(resource);
        }
    }

    private Map<Trackable,ReloadableScript> getScriptCache(Context cx) {
        return cx.getOptimizationLevel() == -1 ?
                interpretedScripts : compiledScripts;
    }

    // helpers for multi-engine isolation and sandboxing
    private Object[] checkThreadLocals() {
        if (engines.get() == this) {
            return null;
        }
        Object[] retval = new Object[] {
            engines.get(),
            modules.get()
        };
        engines.set(this);
        modules.set(new HashMap<Trackable, ModuleScope>());
        return retval;
    }

    private void resetThreadLocals(Object[] objs) {
        if (objs != null) {
            engines.set((RhinoEngine) objs[0]);
            modules.set((Map<Trackable, ModuleScope>) objs[1]);
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
    public Trackable findPath(String path, Repository localRoot) throws IOException {
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
    public Resource findResource(String path, Repository localRoot) throws IOException {
        // Note: as an extension to the securable modules API
        // we allow absolute module paths for resources
        File file = new File(path);
        if (file.isAbsolute()) {
            Resource res = new FileResource(file);
            res.setAbsolute(true);
            return res;
        } else if (localRoot != null && path.startsWith(".")) {
            return findResource(localRoot.getRelativePath() + path, null);
        } else {
            return config.getResource(path);
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
        return config.getRepository(path);
    }

    public void addToClasspath(Trackable path) throws MalformedURLException {
        loader.addURL(path.getUrl());
    }

    /**
     * Provide object serialization for this engine's scripted objects. If no special
     * provisions are required, this method should just wrap the stream with an
     * ObjectOutputStream and write the object.
     *
     * @param obj the object to serialize
     * @param out the stream to write to
     * @throws IOException if an I/O error occurred
     */
    public void serialize(Object obj, OutputStream out) throws IOException {
        final Context cx = contextFactory.enterContext();
        try {
            // use a special ScriptableOutputStream that unwraps Wrappers
            ScriptableOutputStream sout = new ScriptableOutputStream(out, globalScope) {
                protected Object replaceObject(Object obj) throws IOException {
                    if (obj == globalScope) {
                        return new SerializedScopeProxy(null);
                    } else if (obj instanceof ModuleScope || obj instanceof ModuleScope.ExportsObject) {
                        return new SerializedScopeProxy(obj);
                    }
                    return super.replaceObject(obj);
                }
            };

            sout.writeObject(obj);
            sout.flush();
        } finally {
            Context.exit();
        }
    }

    /**
     * Provide object deserialization for this engine's scripted objects. If no special
     * provisions are required, this method should just wrap the stream with an
     * ObjectIntputStream and read the object.
     *
     * @param in the stream to read from
     * @return the deserialized object
     * @throws IOException if an I/O error occurred
     * @throws ClassNotFoundException if a class referred in the stream couldn't be resolved
     */
    public Object deserialize(InputStream in) throws IOException, ClassNotFoundException {
        final Context cx = contextFactory.enterContext();
        try {
            ObjectInputStream sin = new ScriptableInputStream(in, globalScope) {
                protected Object resolveObject(Object obj) throws IOException {
                    if (obj instanceof SerializedScopeProxy) {
                        return ((SerializedScopeProxy) obj).getObject(cx, RhinoEngine.this);
                    } 
                    return super.resolveObject(obj);
                }
            };
            return sin.readObject();
        } finally {
            Context.exit();
        }
    }

    private static class SerializedScopeProxy implements Serializable {
        String moduleName;
        boolean isExports;
        SerializedScopeProxy(Object obj) {
            if (obj instanceof ModuleScope) {
                moduleName = ((ModuleScope) obj).getModuleName();
                isExports = false;
            } else if (obj instanceof ModuleScope.ExportsObject) {
                moduleName = ((ModuleScope.ExportsObject) obj).getModuleName();
                isExports = true;
            }
        }

        Object getObject(Context cx, RhinoEngine engine) throws IOException {
            if (isExports) {
                return engine.loadModule(cx, moduleName, null).getExports();
            }
            return moduleName == null ? engine.globalScope : engine.loadModule(cx, moduleName, null);
        }
    }

    public RingoContextFactory getContextFactory() {
        return contextFactory;
    }

    public RingoClassLoader getClassLoader() {
        return loader;
    }

    public RingoConfiguration getConfiguration() {
        return config;
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

    class RingoWrapFactory extends WrapFactory {

        public RingoWrapFactory() {
            // disable java primitive wrapping, it's just annoying.
            setJavaPrimitiveWrap(false);
        }

        /**
         * Override to wrap maps as scriptables.
         *
         * @param cx         the current Context for this thread
         * @param scope      the scope of the executing script
         * @param obj        the object to be wrapped. Note it can be null.
         * @param staticType type hint. If security restrictions prevent to wrap
         *                   object based on its class, staticType will be used instead.
         * @return the wrapped value.
         */
        @Override
        public Object wrap(Context cx, Scriptable scope, Object obj, Class staticType) {
            if (obj instanceof CaseInsensitiveMap) {
                return new ScriptableMap(scope, (CaseInsensitiveMap) obj);
            }
            return super.wrap(cx, scope, obj, staticType);
        }

    }

    public static class RetryException extends RuntimeException {
        public final String retry;

        public RetryException(String message) {
            super(message);
            retry = message;
        }
    }
}

class AppClassLoader extends RingoClassLoader {

    HashSet<URL> urls = new HashSet<URL>();

    public AppClassLoader() {
        super(new URL[0], RhinoEngine.class.getClassLoader());
    }

    /**
     * Overrides addURL to make it accessable to GlobalFunctions.importJar()
     * @param url the url to add to the classpath
     */
    protected synchronized void addURL(URL url) {
        if (!urls.contains(url)) {
            urls.add(url);
            super.addURL(url);
        }
    }
}


