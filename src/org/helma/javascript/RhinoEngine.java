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

import org.mozilla.javascript.*;
import org.helma.repository.Resource;
import org.helma.repository.Repository;
import org.helma.util.*;
import org.helma.tools.launcher.HelmaClassLoader;

import java.io.IOException;
import java.io.File;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.net.URL;

/**
 * This class provides methods to create JavaScript objects
 * from JavaScript files.
 *
 * @author Hannes Wallnoefer <hannes@helma.at>
 */
public class RhinoEngine {

    List<Repository> repositories;
    ScriptableObject topLevelScope;
    Map<String, ReloadableScript> compiledScripts = new HashMap<String, ReloadableScript>();
    Map<String, ReloadableScript> interpretedScripts = new HashMap<String, ReloadableScript>();
    AppClassLoader loader = new AppClassLoader();
    WrapFactory wrapFactory = new HelmaWrapFactory();
    ContextFactory contextFactory = new HelmaContextFactory(this);

    /**
     * Create a RhinoEngine which loads scripts from directory <code>dir</code>.
     * @param repositories a list of code repositories
     */
    public RhinoEngine(List<Repository> repositories) {
        this(repositories, null);
    }

    /**
     * Create a RhinoEngine which loads scripts from directory <code>dir</code>
     * and defines the given classes as native host objects.
     * @param repositories a list of code repositories
     * @param classes the host classes to define
     */
    public RhinoEngine(List<Repository> repositories, Class[] classes) {
        if (repositories.isEmpty()) {
            throw new IllegalArgumentException("Empty repository list");
        }
        this.repositories = repositories;
        // create a new global scope level
        Context cx = contextFactory.enterContext();
        try {
            topLevelScope = cx.initStandardObjects();
            if (classes != null) {
                // for (int i=0; i<classes.length; i++) {
                for (Class clazz: classes) {
                    ScriptableObject.defineClass(topLevelScope, clazz);
                }
            }
            // ImporterTopLevel.init(cx, topLevelScope, false);
            GlobalFunctions.init(topLevelScope);
            ScriptableList.init(topLevelScope);
            ScriptableMap.init(topLevelScope);
            JSAdapter.init(cx, topLevelScope, false);
        } catch (Exception x) {
            RuntimeException rtx = new IllegalArgumentException("Error defining class");
            rtx.initCause(x);
            throw rtx;
        } finally {
            Context.exit();
        }
    }

    /**
     * Evaluate a module and return the result.
     *
     * @param globals a map of global variables
     * @param path the path of the module to evaluate
     * @return the return value of the evaluation
     * @throws IOException if an I/O related error occurred
     */
    public Object evaluate(Map<String,Object> globals, String path)
            throws IOException {
        Context cx = contextFactory.enterContext();
        try {
            Scriptable scope = createThreadScope(cx);
            initGlobalsAndArguments(scope, globals, null);
            return getScript(path).evaluate(scope, cx);
        } finally {
            Context.exit();
        }
    }

    /**
     * Invoke a javascript function. This enters a JavaScript context, creates
     * a new per-thread scope, calls the function, exits the context and returns
     * the return value of the invocation.
     *
     * @param globals map of global variables to set in the thread scope
     * @param path the file path to the script
     * @param method the method name to call in the script
     * @param args the arguments to pass to the method
     * @return the return value of the invocation
     * @throws NoSuchMethodException the method is not defined
     * @throws IOException an I/O related error occurred
     */
    public Object invoke(Map<String,Object> globals, String path, String method, Object[] args)
            throws IOException, NoSuchMethodException {
        Context cx = contextFactory.enterContext();
        try {
            Scriptable scope = createThreadScope(cx);
            initGlobalsAndArguments(scope, globals, args);
            Scriptable module = loadModule(cx, path, scope, null);
            Object func = ScriptableObject.getProperty(module, method);
            if ((func == ScriptableObject.NOT_FOUND) || !(func instanceof Function)) {
                throw new NoSuchMethodException("Function " + method + "() not defined");
            }
            Object retval = ((Function) func).call(cx, scope, module, args);
            if (retval instanceof Wrapper) {
                return ((Wrapper) retval).unwrap();
            }
            return retval;
        } finally {
            Context.exit();
        }
    }

    /**
     * Return a shell scope for interactive evaluation
     * @return a shell scope
     */
    public ModuleScope getShellScope() {
        Context cx = contextFactory.enterContext();
        try {
            Scriptable scope = createThreadScope(cx);
            Resource resource = repositories.get(0).getResource("<shell>");
            ModuleScope module = new ModuleScope(resource, null, scope);
            try {
                // exec script on scope without setting the module resource -
                // this is why we don't use ReloadableScript.evaluate().
                getScript("helma.shell").getScript(cx).exec(cx, scope);
            } catch (Exception x) {
                System.err.println("Warning: couldn't load module 'helma.shell'.");
            }
            return module;
        } finally {
            Context.exit();
        }
    }

    /**
     * Invoke a javascript function. This enters a JavaScript context, creates
     * a new per-thread scope, calls the function, exits the context and returns
     * the return value of the invocation.
     *
     * @param globals map of global variables to set in the thread scope
     * @param thisObj the object to invoke the function on
     * @param function the function object to invoke
     * @param args the arguments to pass to the method
     * @return the return value of the invocation
     * @throws NoSuchMethodException the method is not defined
     * @throws IOException an I/O related error occurred
     */
    public Object invoke(Map<String,Object> globals, Scriptable thisObj, Function function, Object[] args)
            throws IOException, NoSuchMethodException {
        Context cx = contextFactory.enterContext();
        try {
            Scriptable threadScope = function.getParentScope();
            initGlobalsAndArguments(threadScope, globals, args);

            Object retval = (function).call(cx, threadScope, thisObj, args);
            if (retval instanceof Wrapper) {
                return ((Wrapper) retval).unwrap();
            }
            return retval;
        } finally {
            Context.exit();
        }
    }

    /**
     * Create the per-thread top level javascript scope.
     * This has the global shared scope as prototype, and serves as
     * prototype for the module scopes loaded by this thread.
     * @param cx the current context
     * @return the scope object
     */
    protected Scriptable createThreadScope(Context cx) {
        Scriptable threadScope = cx.newObject(topLevelScope);
        threadScope.setPrototype(topLevelScope);
        threadScope.setParentScope(null);
        ScriptableObject.defineProperty(threadScope, "global", threadScope,
                ScriptableObject.DONTENUM);
        return threadScope;
    }

    /**
     * Initialize and normalize the global variables and arguments on a thread scope.
     * @param scope the thread local scope
     * @param globals the map of global objects
     * @param args the arguments
     */
    protected void initGlobalsAndArguments(Scriptable scope, Map<String,Object> globals, Object[] args) {
        if (globals != null && !globals.isEmpty()) {
            for (String key: globals.keySet()) {
                Object value = globals.get(key);
                scope.put(key, scope, wrapArgument(value, scope));
            }
        }
        if (args != null) {
            for (int i = 0; i < args.length; i++) {
                args[i] = wrapArgument(args[i], scope);
            }
        }
    }

    /**
     * Prepare a single property or argument value for use within rhino.
     * @param value the property or argument value
     * @param scope the scope
     * @return the object wrapped and wired for rhino
     */
    protected Object wrapArgument(Object value, Scriptable scope) {
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
        Map<String,ReloadableScript> scripts = cx.getOptimizationLevel() == -1 ?
                interpretedScripts : compiledScripts;
        ReloadableScript script = scripts.get(moduleName);
        if (script == null) {
            String resourceName = moduleName.replace('.', File.separatorChar) + ".js";
            Resource resource = findResource(resourceName, localPath);
            script = new ReloadableScript(resource, this);
            if (resource.exists()) {
                scripts.put(moduleName, script);
            }
        }
        return script;
    }

    /**
     * Load a Javascript module into a module scope. This checks if the module has already
     * been loaded in the current context and if so returns the existing module scope.
     * @param cx the current context
     * @param moduleName the module name
     * @param parentScope the parent scope to load the module
     * @param loadingScope the scope requesting the module
     * @return the loaded module scope
     * @throws IOException indicates that in input/output related error occurred
     */
    public Scriptable loadModule(Context cx, String moduleName,
                                 Scriptable parentScope, Scriptable loadingScope)
            throws IOException {
        Map modules = (Map) cx.getThreadLocal("modules");
        if (modules.containsKey(moduleName)) {
            return (Scriptable) modules.get(moduleName);
        }
        Repository local = loadingScope instanceof ModuleScope ?
                ((ModuleScope) loadingScope).getRepository() : null;
        ReloadableScript script = getScript(moduleName, local);
        Scriptable scope = script.load(parentScope, loadingScope, cx);
        modules.put(moduleName, scope);
        return scope;
    }

    /**
     * Get a resource from our script repository
     * @param path the resource path
     * @return the resource
     */
    public Resource getResource(String path) {
        for (Repository repo: repositories) {
            Resource res = repo.getResource(path);
            if (res.exists()) {
                return res;
            }
        }
        return repositories.get(0).getResource(path);
    }

    /**
     * Get a list of all child resources for the given path relative to
     * our script repository.
     * @param path the repository path
     * @return a list of all nested child resources
     */
    public List<Resource> getResources(String path) {
        return repositories.get(0).getResources(path);
    }

    /**
     * Search for a resource in a local path, or the main repository.
     * @param path the resource name
     * @param localPath a repository to look first
     * @return the resource
     */
    public Resource findResource(String path, Repository localPath) {
        if (localPath != null) {
            Resource resource = localPath.getResource(path);
            if (resource.exists()) {
                return resource;
            }
        }
        return getResource(path);
    }

    public ContextFactory getContextFactory() {
        return contextFactory;
    }

    public HelmaClassLoader getClassLoader() {
        return loader;
    }

    public WrapFactory getWrapFactory() {
        return wrapFactory;
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
        public Scriptable wrapAsJavaObject(Context cx, Scriptable scope, Object javaObject, Class staticType) {
            return super.wrapAsJavaObject(cx, scope, javaObject, staticType);
        }
    }

}

class AppClassLoader extends HelmaClassLoader {

    public AppClassLoader() {
        super(new URL[0], RhinoEngine.class.getClassLoader());
    }

    /**
     * Overrides addURL to make it accessable to GlobalFunctions.importJar()
     * @param url the url to add to the classpath
     */
    protected void addURL(URL url) {
        super.addURL(url);
    }
}


