package org.ringojs.engine;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Wrapper;
import org.ringojs.repository.Repository;
import org.ringojs.repository.Resource;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledThreadPoolExecutor;

public class RingoWorker {

    private ScheduledThreadPoolExecutor eventloop;
    private final RhinoEngine engine;

    private ReloadableScript currentScript;
    private List<SyntaxError> errors;
    private Map<Resource, ModuleScope> modules;


    public RingoWorker(RhinoEngine engine) {
        this.engine = engine;
        modules = new HashMap<Resource, ModuleScope>();
        errors = new ArrayList<SyntaxError>();
    }

    public synchronized Object invoke(Object module, String method,
                                       Object... args)
            throws NoSuchMethodException, IOException {
        ContextFactory contextFactory = engine.getContextFactory();
        Scriptable scope = engine.getScope();
        Context cx = contextFactory.enterContext();
        engine.setCurrentWorker(this);
        try {
            engine.initArguments(args);
            if (!(module instanceof String) && !(module instanceof Scriptable)) {
                throw new IllegalArgumentException(
                        "module argument must be a Scriptable or String object");
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
                    retval = ((Function) function).call(cx, scope, scriptable, args);
                    break;
                } catch (JavaScriptException jsx) {
                    Scriptable thrown = jsx.getValue() instanceof Scriptable ?
                            (Scriptable) jsx.getValue() : null;
                    if (thrown != null && thrown.get("retry", thrown) == Boolean.TRUE) {
                        modules.clear();
                    } else {
                        throw jsx;
                    }
                } catch (RhinoEngine.RetryException retry) {
                    // request to try again
                    modules.clear();
                }
            }
            if (retval instanceof Wrapper) {
                return ((Wrapper) retval).unwrap();
            }
            return retval;
        } finally {
            engine.setCurrentWorker(null);
            Context.exit();
        }
    }

    public Future<Object> submit(final Object module, final String method,
                                 final Object... args) {
        if (eventloop == null) {
            initEventLoop();
        }
        return eventloop.submit(new Callable<Object>() {
            public Object call() throws Exception {
                return invoke(module, method, args);
            }
        });
    }

    private synchronized void initEventLoop() {
        if (eventloop == null) {
            eventloop = new ScheduledThreadPoolExecutor(1);
        }
    }

    /**
     * Load a Javascript module into a module scope. This checks if the module has already
     * been loaded in the current context and if so returns the existing module scope.
     * @param cx the current context
     * @param moduleName the module name
     * @param loadingScope the scope requesting the module
     * @return the loaded module's scope
     * @throws java.io.IOException indicates that in input/output related error occurred
     */
    protected synchronized ModuleScope loadModule(Context cx,
                                                  String moduleName,
                                                  Scriptable loadingScope)
            throws IOException {
        Repository local = engine.getParentRepository(loadingScope);
        ReloadableScript script = engine.getScript(moduleName, local);

        ModuleScope module;
        ReloadableScript parent = currentScript;
        try {
            // check if we already came across the module in the current context/request
            if (modules.containsKey(script.resource)) {
                return modules.get(script.resource);
            }
            currentScript = script;
            module = script.load(engine.getScope(), cx, modules);
        } finally {
            if (parent != null) {
                parent.addDependency(script);
            }
            currentScript = parent;
        }

        return module;
    }

    /**
     * Evaluate a script within a given scope.
     * @param cx the current context
     * @param script the script
     * @param scope the scope
     * @return the value returned by the script
     * @throws IOException an I/O related error occurred
     */
    protected synchronized Object evaluateScript(Context cx,
                                                 ReloadableScript script,
                                                 Scriptable scope)
            throws IOException {
        Object result;
        ReloadableScript parent = currentScript;
        try {
            currentScript = script;
            result = script.evaluate(scope, modules, cx);
        } finally {
            if (parent != null) {
                parent.addDependency(script);
            }
            currentScript = parent;
        }
        return result;
    }

    public RhinoEngine getEngine() {
        return engine;
    }

    public List<SyntaxError> getErrors() {
        return errors;
    }

    protected void reset() {
        // todo
    }

}
