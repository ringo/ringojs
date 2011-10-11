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
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class RingoWorker {

    private ScheduledThreadPoolExecutor eventloop;
    private final RhinoEngine engine;
    private final Lock runlock = new ReentrantLock();

    private ReloadableScript currentScript;
    private List<SyntaxError> errors;
    private Map<Resource, ModuleScope> modules;

    private static AtomicInteger workerId = new AtomicInteger(1);
    private final int id;

    public RingoWorker(RhinoEngine engine) {
        this.engine = engine;
        modules = new HashMap<Resource, ModuleScope>();
        errors = new ArrayList<SyntaxError>();
        id = workerId.getAndIncrement();
    }

    public Object invoke(Object module, Object function,
                                      Object... args)
            throws NoSuchMethodException, IOException {
        ContextFactory contextFactory = engine.getContextFactory();
        Scriptable scope = engine.getScope();
        Context cx = contextFactory.enterContext();
        runlock.lock();
        engine.setCurrentWorker(this);
        try {
            if (!(module instanceof String) && !(module instanceof Scriptable)) {
                throw new IllegalArgumentException(
                        "module argument must be a Scriptable or String object");
            }
            Scriptable scriptable = module instanceof Scriptable ?
                    (Scriptable) module : loadModule(cx, (String) module, null);
            if (!(function instanceof Function)) {
                Object fun = ScriptableObject.getProperty(scriptable, function.toString());
                if (!(fun instanceof Function)) {
                    throw new NoSuchMethodException("Function " + function + " not defined");
                }
                function = fun;
            }
            engine.initArguments(args);
            Object retval;
            while (true) {
                try {
                    retval = ((Function) function).call(cx, scope, scriptable, args);
                    break;
                } catch (JavaScriptException jsx) {
                    Object value = jsx.getValue();
                    if (value instanceof Scriptable && ScriptableObject
                            .getProperty((Scriptable)value, "retry") == Boolean.TRUE) {
                        modules.clear();
                    } else {
                        throw jsx;
                    }
                } catch (RhinoEngine.RetryException retry) {
                    // request to try again
                    modules.clear();
                }
            }
            return retval instanceof Wrapper ?
                    ((Wrapper) retval).unwrap() : retval;
        } finally {
            engine.setCurrentWorker(null);
            runlock.unlock();
            Context.exit();
        }
    }

    public Future<Object> submit(final Object module, final Object method,
                                 final Object... args) {
        engine.increaseAsyncCount();
        if (eventloop == null) {
            initEventLoop();
        }
        return eventloop.submit(new Callable<Object>() {
            public Object call() throws Exception {
                try {
                    return invoke(module, method, args);
                } finally {
                    engine.decreaseAsyncCount();
                }
            }
        });
    }

    public ScheduledFuture<Object> schedule(long delay, final Object module,
                                            final Object method,
                                            final Object... args) {
        engine.increaseAsyncCount();
        if (eventloop == null) {
            initEventLoop();
        }
        return eventloop.schedule(new Callable<Object>() {
            public Object call() throws Exception {
                try {
                    return invoke(module, method, args);
                } finally {
                    engine.decreaseAsyncCount();
                }
            }
        }, delay, TimeUnit.MILLISECONDS);
    }

    public ScheduledFuture<?> scheduleInterval(long delay, final Object module,
                                               final Object method,
                                               final Object... args) {
        if (eventloop == null) {
            initEventLoop();
        }
        return eventloop.scheduleAtFixedRate(new Runnable() {
            public void run() {
                try {
                    invoke(module, method, args);
                } catch (Exception x) {
                    throw new RuntimeException(x);
                }
            }
        }, delay, delay, TimeUnit.MILLISECONDS);
    }

    private synchronized void initEventLoop() {
        if (eventloop == null) {
            eventloop = new ScheduledThreadPoolExecutor(1, new ThreadFactory() {
                public Thread newThread(Runnable runnable) {
                    Thread thread = new Thread(runnable, "ringo-worker-" + id);
                    thread.setDaemon(true);
                    return thread;
                }
            });
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
    protected ModuleScope loadModule(Context cx,
                                                  String moduleName,
                                                  Scriptable loadingScope)
            throws IOException {
        Repository local = engine.getParentRepository(loadingScope);
        ReloadableScript script = engine.getScript(moduleName, local);

        ModuleScope module;
        ReloadableScript parent = currentScript;
        runlock.lock();
        try {
            // check if we already came across the module in the current context/request
            if (modules.containsKey(script.resource)) {
                return modules.get(script.resource);
            }
            currentScript = script;
            module = script.load(engine.getScope(), cx, modules);
        } finally {
            currentScript = parent;
            runlock.unlock();
            if (parent != null) {
                parent.addDependency(script);
            }
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
    protected Object evaluateScript(Context cx,
                                                 ReloadableScript script,
                                                 Scriptable scope)
            throws IOException {
        Object result;
        ReloadableScript parent = currentScript;
        runlock.lock();
        try {
            currentScript = script;
            result = script.evaluate(scope, modules, cx);
        } finally {
            currentScript = parent;
            runlock.unlock();
            if (parent != null) {
                parent.addDependency(script);
            }
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
