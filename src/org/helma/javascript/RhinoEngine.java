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

package org.helma.javascript;

import org.apache.log4j.Logger;
import org.helma.repository.*;
import org.helma.tools.HelmaConfiguration;
import org.helma.tools.launcher.HelmaClassLoader;
import org.helma.util.*;
import org.mozilla.javascript.*;
import org.mozilla.javascript.serialize.ScriptableOutputStream;
import org.mozilla.javascript.serialize.ScriptableInputStream;

import java.io.*;
import java.lang.reflect.InvocationTargetException;
import java.net.URL;
import java.net.MalformedURLException;
import java.util.*;

/**
 * This class provides methods to create JavaScript objects
 * from JavaScript files.
 *
 * @author Hannes Wallnoefer <hannes@helma.at>
 */
public class RhinoEngine {

    HelmaConfiguration                 config;
    List<Repository>                   repositories;
    ScriptableObject                   topLevelScope;
    List<String>                       commandLineArgs;
    Map<Trackable, ReloadableScript>   compiledScripts    = new HashMap<Trackable, ReloadableScript>();
    Map<Trackable, ReloadableScript>   interpretedScripts = new HashMap<Trackable, ReloadableScript>();
    AppClassLoader                     loader             = new AppClassLoader();
    HelmaWrapFactory                   wrapFactory        = new HelmaWrapFactory();
    Map<String, ExtendedJavaClass>     javaWrappers       = new HashMap<String, ExtendedJavaClass>();
    Set<Class>                         hostClasses        = new HashSet<Class>();

    HelmaContextFactory                contextFactory     = null;
    ModuleScope                        mainScope          = null;

    public static final Object[]       EMPTY_ARGS         = new Object[0];

    private Logger                     log                = Logger.getLogger("org.helma.javascript.RhinoEngine");

    /**
     * Create a RhinoEngine which loads scripts from directory <code>dir</code>
     * and defines the given classes as native host objects.
     * @param config the configuration used to initialize the engine.
     * @param globals an optional map of predefined global properties
     */
    public RhinoEngine(HelmaConfiguration config, Map<String, Object> globals) {
        this.config = config;
        contextFactory = new HelmaContextFactory(this, config);
        this.repositories = config.getRepositories();
        if (repositories.isEmpty()) {
            throw new IllegalArgumentException("Empty repository list");
        }
        // create a new global scope level
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals(cx);
        try {
            if (config.getClassShutter() != null) {
                cx.setClassShutter(config.getClassShutter());
            }
            topLevelScope = new ImporterTopLevel(cx);
            Class[] classes = config.getHostClasses();
            if (classes != null) {
                // for (int i=0; i<classes.length; i++) {
                for (Class clazz: classes) {
                    defineHostClass(clazz);
                }
            }
            StaticMethods.init(topLevelScope);
            ScriptableList.init(topLevelScope);
            ScriptableMap.init(topLevelScope);
            ScriptableObject.defineClass(topLevelScope, ScriptableWrapper.class);
            ScriptableObject.defineProperty(topLevelScope, "__name__", "global",
                    ScriptableObject.DONTENUM);
            if (globals != null) {
                for (Map.Entry<String, Object> entry : globals.entrySet()) {
                    ScriptableObject.defineProperty(topLevelScope, entry.getKey(),
                            entry.getValue(), ScriptableObject.DONTENUM);
                }
            }
            evaluate(cx, getScript("helmaglobal"), topLevelScope);
            if (config.isSealed()) {
                topLevelScope.sealObject();
            }
        } catch (Exception x) {
            throw new IllegalArgumentException("Error initializing engine", x);
        } finally {
            Context.exit();
            resetThreadLocals(cx, threadLocals);
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
    public void defineHostClass(Class clazz)
            throws InvocationTargetException, InstantiationException, IllegalAccessException {
        synchronized (clazz) {
            if (!hostClasses.contains(clazz)) {
               hostClasses.add(clazz);
               ScriptableObject.defineClass(topLevelScope, clazz);
            }
        }
    }

    /**
     * Invoke a script from the command line.
     * @param scriptName the name of the script
     * @param scriptArgs an array of command line arguments
     * @return the return value
     * @throws IOException an I/O related error occurred
     * @throws JavaScriptException the script threw an error during
     *         compilation or execution
     */
    public Object runScript(String scriptName, String... scriptArgs)
            throws IOException, JavaScriptException {
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals(cx);
        try {
        	Object retval;
            Map<Trackable,ReloadableScript> scripts = cx.getOptimizationLevel() == -1 ?
                    interpretedScripts : compiledScripts;
            commandLineArgs = Arrays.asList(scriptArgs);
            Resource resource = findResource(scriptName, null);
            if (resource == null || !resource.exists()) {
                resource = new FileResource(new File(scriptName));
            }
            if (!resource.exists()) {
                String moduleName = scriptName + ".js";
                resource = findResource(moduleName, null);
            }
            if (resource instanceof FileResource) {
                ((FileResource) resource).setStripShebang(true);
            }
            ReloadableScript script = new ReloadableScript(resource, this);
            scripts.put(resource, script);
            mainScope = new ModuleScope("__main__", resource, topLevelScope, cx);
            retval = evaluate(cx, script, mainScope);
        	if (retval instanceof Wrapper) {
        		return ((Wrapper) retval).unwrap();
        	}
        	return retval;
        } finally {
        	Context.exit();
            resetThreadLocals(cx, threadLocals);
        }   	
    }
    
    /**
     * Invoke a javascript function. This enters a JavaScript context, creates
     * a new per-thread scope, calls the function, exits the context and returns
     * the return value of the invocation.
     *
     * @param moduleName the name of the script module, or null for the main module
     * @param method the method name to call in the script
     * @param args the arguments to pass to the method
     * @return the return value of the invocation
     * @throws NoSuchMethodException the method is not defined
     * @throws IOException an I/O related error occurred
     */
    public Object invoke(String moduleName, String method, Object... args)
            throws IOException, NoSuchMethodException {
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals(cx);
        try {
            initArguments(args);
            if (moduleName == null) {
                moduleName = config.getMainModule("main");
            }
            Object retval;
            while (true) {
                try {
                    Scriptable module = loadModule(cx, moduleName, null);
                    Object function = ScriptableObject.getProperty(module, method);
                    if ((function == ScriptableObject.NOT_FOUND) || !(function instanceof Function)) {
                        throw new NoSuchMethodException("Function " + method + " not defined");
                    }
                    retval = ((Function) function).call(cx, topLevelScope, module, args);
                    break;
                } catch (JavaScriptException jsx) {
                    Scriptable thrown = jsx.getValue() instanceof Scriptable ?
                            (Scriptable) jsx.getValue() : null;
                    if (thrown != null && thrown.get("retry", thrown) == Boolean.TRUE) {
                        ((Map) cx.getThreadLocal("modules")).clear();
                    } else {
                        throw jsx;
                    }
                } catch (RetryException retry) {
                    // request to try again
                    ((Map) cx.getThreadLocal("modules")).clear();                    
                }
            }
            if (retval instanceof Wrapper) {
                return ((Wrapper) retval).unwrap();
            }
            return retval;
        } finally {
            Context.exit();
            resetThreadLocals(cx, threadLocals);
        }
    }

    public Object invoke(Callable callable, Object... args)
            throws IOException, NoSuchMethodException {
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals(cx);
        try {
            initArguments(args);
            Object retval;
            while (true) {
                try {
                    retval = callable.call(cx, topLevelScope, null, args);
                    break;
                } catch (JavaScriptException jsx) {
                    Scriptable thrown = jsx.getValue() instanceof Scriptable ?
                            (Scriptable) jsx.getValue() : null;
                    if (thrown != null && thrown.get("retry", thrown) == Boolean.TRUE) {
                        ((Map) cx.getThreadLocal("modules")).clear();
                    } else {
                        throw jsx;
                    }
                } catch (RetryException retry) {
                    // request to try again
                    ((Map) cx.getThreadLocal("modules")).clear();
                }
            }
            if (retval instanceof Wrapper) {
                return ((Wrapper) retval).unwrap();
            }
            return retval;
        } finally {
            Context.exit();
            resetThreadLocals(cx, threadLocals);
        }
    }

    /**
     * Return a shell scope for interactive evaluation
     * @return a shell scope
     * @throws IOException an I/O related exception occurred
     */
    public Scriptable getShellScope() throws IOException {
        Context cx = contextFactory.enterContext();
        Object[] threadLocals = checkThreadLocals(cx);
        try {
            Repository repository = repositories.get(0);
            Resource resource = repository.getResource("<shell>");
            Scriptable parentScope = mainScope != null ? mainScope : topLevelScope;
            ModuleScope scope = new ModuleScope("<shell>", resource, parentScope, cx);
            try {
                evaluate(cx, getScript("helma/shell"), scope);
            } catch (Exception x) {
                log.error("Warning: couldn't load module 'helma/shell'", x);
            }
            return scope;
        } finally {
            Context.exit();
            resetThreadLocals(cx, threadLocals);
        }
    }

    /**
     * Initialize and normalize the global variables and arguments on a thread scope.
     * @param args the arguments
     */
    protected void initArguments(Object[] args) {
        if (args != null) {
            for (int i = 0; i < args.length; i++) {
                args[i] = wrapArgument(args[i], topLevelScope);
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
            scriptable.setPrototype(ScriptableObject.getClassPrototype(
                    scope, scriptable.getClassName()));
            scriptable.setParentScope(scope);
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
        Map<Trackable,ReloadableScript> scripts = cx.getOptimizationLevel() == -1 ?
                interpretedScripts : compiledScripts;
        ReloadableScript script;
        Trackable source;
        boolean isWildcard = moduleName.endsWith(".*");
        if (isWildcard) {
            String repositoryName = moduleName
                    .substring(0, moduleName.length() - 2);
            source = findRepository(repositoryName, localPath);
        } else {
            String resourceName = moduleName + ".js";
            source = findResource(resourceName, localPath);
        }
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

    protected Object evaluate(Context cx, ReloadableScript script, Scriptable scope)
            throws IOException {
        Object result;
        ReloadableScript parent = getCurrentScript(cx);
        try {
            setCurrentScript(cx, script);
            result = script.evaluate(scope, cx);
        } finally {
            if (parent != null) {
                parent.addDependency(script);
            }
            setCurrentScript(cx, parent);
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
    public Scriptable loadModule(Context cx, String moduleName, Scriptable loadingScope)
            throws IOException {
        Repository local = getParentRepository(loadingScope);
        ReloadableScript script = getScript(moduleName, local);
        Scriptable module;
        ReloadableScript parent = getCurrentScript(cx);
        try {
            setCurrentScript(cx, script);
            module = script.load(topLevelScope, cx);
        } finally {
            if (parent != null) {
                parent.addDependency(script);
            }
            setCurrentScript(cx, parent);
        }
        return module;
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
     */
    public RhinoEngine createSandbox(String modulePath, Map<String,Object> globals,
                                     ClassShutter shutter, boolean sealed)
            throws FileNotFoundException {
        HelmaConfiguration sandbox = new HelmaConfiguration(config.getHelmaHome(), modulePath, null);
        sandbox.setClassShutter(shutter);
        sandbox.setSealed(sealed);
        return new RhinoEngine(sandbox, globals);
    }

    private ReloadableScript getCurrentScript(Context cx) {
        return (ReloadableScript) cx.getThreadLocal("current_script");
    }

    private void setCurrentScript(Context cx, ReloadableScript script) {
        cx.putThreadLocal("current_script", script);
    }

    private Object[] checkThreadLocals(Context cx) {
        if (cx.getThreadLocal("engine") == this) {
            return null;
        }
        Object[] retval = new Object[] {
            cx.getThreadLocal("engine"),
            cx.getThreadLocal("modules")
        };
        cx.putThreadLocal("engine", this);
        cx.putThreadLocal("modules", new HashMap<Trackable, Scriptable>());
        return retval;
    }

    private void resetThreadLocals(Context cx, Object[] objs) {
        if (objs != null) {
            cx.putThreadLocal("engine", objs[0]);
            cx.putThreadLocal("modules", objs[1]);
        }
    }

    public ScriptableObject getTopLevelScope() {
        return topLevelScope;
    }

    public List<String> getCommandLineArguments() {
        if (commandLineArgs == null) {
            commandLineArgs = Collections.emptyList();
        }
        return Collections.unmodifiableList(commandLineArgs);
    }

    public List<Repository> getRepositories() {
        return repositories;
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
    public List<Resource> findResources(String path, boolean recursive) {
        return config.getResources(path, recursive);
    }

    /**
     * Search for a resource in a local path, or the main repository path.
     * @param path the resource name
     * @param localRoot a repository to look first
     * @return the resource
     */
    public Resource findResource(String path, Repository localRoot) {
        // FIXME: we allow absolute module paths, and we do not check
        // if relative paths escape their root repository. These are
        // of course gaping security holes for environments running
        // non-trusted code.
        File file = new File(path);
        if (file.isAbsolute()) {
            return new FileResource(file);
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
     */
    public Repository findRepository(String path, Repository localPath) {
        // To be consistent, always return absolute repository if path is absolute
        // if we make this dependent on whether files exist we introduce a lot of
        // vague and undetermined behaviour.
        File file = new File(path);
        if (file.isAbsolute()) {
            return new FileRepository(file);
        }
        if (localPath != null) {
            Repository repository = localPath.getChildRepository(path);
            if (repository.exists()) {
                return repository;
            }
        }
        return config.getRepository(path);
    }

    public void addToClasspath(Resource resource) throws MalformedURLException {
        loader.addURL(resource.getUrl());
    }

    /**
     * Provide object serialization for this engine's scripted objects. If no special
     * provisions are required, this method should just wrap the stream with an
     * ObjectOutputStream and write the object.
     *
     * @param obj the object to serialize
     * @param out the stream to write to
     * @throws java.io.IOException
     */
    public void serialize(Object obj, OutputStream out) throws IOException {
        final Context cx = contextFactory.enterContext();
        try {
            // use a special ScriptableOutputStream that unwraps Wrappers
            ScriptableOutputStream sout = new ScriptableOutputStream(out, topLevelScope) {
                protected Object replaceObject(Object obj) throws IOException {
                    if (obj == topLevelScope) {
                        return new SerializedScopeProxy(null);
                    } else if (obj instanceof ModuleScope) {
                        return new SerializedScopeProxy(((ModuleScope) obj).getName());
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
     * @throws java.io.IOException
     */
    public Object deserialize(InputStream in) throws IOException, ClassNotFoundException {
        final Context cx = contextFactory.enterContext();
        try {
            ObjectInputStream sin = new ScriptableInputStream(in, topLevelScope) {
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
        SerializedScopeProxy(String moduleName) {
            this.moduleName = moduleName;
        }

        Object getObject(Context cx, RhinoEngine engine) throws IOException {
            return moduleName == null ? engine.topLevelScope : engine.loadModule(cx, moduleName, null);
        }
    }

    public HelmaContextFactory getContextFactory() {
        return contextFactory;
    }

    public HelmaClassLoader getClassLoader() {
        return loader;
    }

    public WrapFactory getWrapFactory() {
        return wrapFactory;
    }

    public ExtendedJavaClass getExtendedClass(Class type) {
        ExtendedJavaClass wrapper = javaWrappers.get(type.getName());
        if (wrapper == null || wrapper == ExtendedJavaClass.NONE) {
            wrapper = new ExtendedJavaClass(topLevelScope, type);
            javaWrappers.put(type.getName(), wrapper);
            Iterator<Map.Entry<String,ExtendedJavaClass>> it =
                    javaWrappers.entrySet().iterator();
            while (it.hasNext()) {
                if (it.next().getValue() == ExtendedJavaClass.NONE) {
                    it.remove();
                }
            }
        }
        return wrapper;
    }

    class HelmaWrapFactory extends WrapFactory {

        public HelmaWrapFactory() {
            // disable java primitive wrapping, it's just annoying.
            setJavaPrimitiveWrap(false);
        }

        /**
         * Wrap the object.
         * <p/>
         * The value returned must be one of
         * <UL>
         * <LI>java.lang.Boolean</LI>
         * <LI>java.lang.String</LI>
         * <LI>java.lang.Number</LI>
         * <LI>org.mozilla.javascript.Scriptable objects</LI>
         * <LI>The value returned by Context.getUndefinedValue()</LI>
         * <LI>null</LI>
         * </UL>
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

        /**
         * Wrap an object newly created by a constructor call.
         *
         * @param cx    the current Context for this thread
         * @param scope the scope of the executing script
         * @param obj   the object to be wrapped
         * @return the wrapped value.
         */
        @Override
        public Scriptable wrapNewObject(Context cx, Scriptable scope, Object obj) {
            return super.wrapNewObject(cx, scope, obj);
        }

        /**
         * Wrap Java object as Scriptable instance to allow full access to its
         * methods and fields from JavaScript.
         * <p/>
         * {@link #wrap(org.mozilla.javascript.Context,org.mozilla.javascript.Scriptable,Object,Class)} and
         * {@link #wrapNewObject(org.mozilla.javascript.Context,org.mozilla.javascript.Scriptable,Object)} call this method
         * when they can not convert <tt>javaObject</tt> to JavaScript primitive
         * value or JavaScript array.
         * <p/>
         * Subclasses can override the method to provide custom wrappers
         * for Java objects.
         *
         * @param cx         the current Context for this thread
         * @param scope      the scope of the executing script
         * @param javaObject the object to be wrapped
         * @param staticType type hint. If security restrictions prevent to wrap
         *                   object based on its class, staticType will be used instead.
         * @return the wrapped value which shall not be null
         */
        @Override
        public Scriptable wrapAsJavaObject(Context cx, Scriptable scope, Object javaObject, Class staticType) {
            // TODO: for now we always use the actual class as staticType may be an interface
            // and getExtendedClass() can't deal with that
            ExtendedJavaClass extClass = getExtendedClass(javaObject.getClass());
            if (extClass != null) {
                return new ExtendedJavaObject(scope, javaObject, staticType, extClass);
            }
            return super.wrapAsJavaObject(cx, scope, javaObject, staticType);
        }

        protected ExtendedJavaClass getExtendedClass(Class clazz) {
            if (clazz.isInterface()) {
                // can't deal with interfaces - panic
                throw new IllegalArgumentException("Can't extend interface " + clazz.getName());
            }
            // How class name to prototype name lookup works:
            // If an object is not found by its direct class name, a cache entry is added
            // for the class name. For negative result, the string "(unmapped)" is used
            // as cache value.
            //
            // Caching is done directly in classProperties, as ResourceProperties have
            // the nice effect of being purged when the underlying resource is updated,
            // so cache invalidation happens implicitely.
            String className = clazz.getName();
            ExtendedJavaClass extClass = javaWrappers.get(className);
            // fast path: direct hit, either positive or negative
            if (extClass != null) {
                return extClass == ExtendedJavaClass.NONE ? null : extClass;
            }

            // walk down superclass path. We already checked the actual class,
            // and we know that java.lang.Object does not implement any interfaces,
            // and the code is streamlined a bit to take advantage of this.
            while (clazz != Object.class) {
                // check interfaces
                Class[] classes = clazz.getInterfaces();
                for (Class interfaceClass : classes) {
                    extClass = javaWrappers.get(interfaceClass.getName());
                    if (extClass != null) {
                        // cache the class name for the object so we run faster next time
                        javaWrappers.put(className, extClass);
                        return extClass;
                    }
                }
                clazz = clazz.getSuperclass();
                extClass = javaWrappers.get(clazz.getName());
                if (extClass != null) {
                    // cache the class name for the object so we run faster next time
                    javaWrappers.put(className, extClass);
                    return extClass == ExtendedJavaClass.NONE ? null : extClass;
                }
            }
            // not mapped - cache negative result
            javaWrappers.put(className, ExtendedJavaClass.NONE);
            return null;
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

class AppClassLoader extends HelmaClassLoader {

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


