package org.ringojs.engine;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.RhinoException;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Wrapper;
import org.ringojs.repository.Repository;
import org.ringojs.repository.Resource;

import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.Delayed;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

public final class RingoWorker {

    private EventLoop eventloop;
    private final RhinoEngine engine;
    private final ReentrantLock runlock = new ReentrantLock();

    private ReloadableScript currentScript;
    private List<ScriptError> errors;
    private Function errorListener;
    private Map<Resource, Scriptable> modules, checkedModules;
    private boolean reload;

    private static AtomicInteger workerId = new AtomicInteger(1);
    private final int id;

    /**
     * Create a new ringo worker
     * @param engine the engine
     */
    public RingoWorker(RhinoEngine engine) {
        this.engine = engine;
        modules = new HashMap<Resource, Scriptable>();
        reload = engine.getConfig().isReloading();
        checkedModules = reload ? new HashMap<Resource, Scriptable>() : modules;
        id = workerId.getAndIncrement();
    }

    /**
     * Returns a string representation of the worker.
     */
    public String toString() {
        return "ringo-worker-" + id;
    }

    /**
     * <p>Invoke the function specified by `function` in module `module` with the
     * given arguments on the current thread. If this worker is currently busy
     * running another thread this method will block until the other thread
     * is done.</p>
     *
     * <p>Note that if module specifies a module id, the function is looked
     * up in the top level module scope, not the module's exports object.</p>
     *
     * @param module the module id or object
     * @param function the function name or object
     * @param args optional arguments to pass to the function
     * @return the return value of the function invocation
     * @throws NoSuchMethodException if the function could not be found
     * @throws IOException if loading the module caused an IO error
     */
    public Object invoke(Object module, Object function, Object... args)
            throws NoSuchMethodException, IOException {

        Scriptable scope = engine.getScope();
        Context cx = engine.getContextFactory().enterContext(null);
        errors = new LinkedList<ScriptError>();
        RingoWorker previous = acquireWorker();
        if (reload) checkedModules.clear();

        try {
            if (!(module instanceof CharSequence) && !(module instanceof Scriptable)) {
                throw new IllegalArgumentException(
                        "module argument must be a Scriptable or String object");
            }

            Scriptable scriptable;
            if (module instanceof Scriptable) {
                scriptable = (Scriptable) module;
            } else {
                String moduleId = ScriptRuntime.toString(module);
                scriptable = loadModule(cx, moduleId, null);
            }

            if (!(function instanceof Function)) {
                Object fun = ScriptableObject.getProperty(scriptable, function.toString());
                if (!(fun instanceof Function)) {
                    throw new NoSuchMethodException("Function " + function + " not defined");
                }
                function = fun;
            }

            engine.initArguments(args);
            Object retval = ((Function) function).call(cx, scope, scriptable, args);
            return retval instanceof Wrapper ? ((Wrapper) retval).unwrap() : retval;
        } catch (RhinoException rx) {
            if (errorListener != null) {
                Object error;
                if (rx instanceof JavaScriptException) {
                    error = ((JavaScriptException)rx).getValue();
                } else {
                    error = ScriptRuntime.wrapException(rx, scope, cx);
                }
                errorListener.call(cx, scope, scope, new Object[] {error});
                return null;
            } else {
                throw rx;
            }
        } finally {
            releaseWorker(previous);
            Context.exit();
        }
    }

    /**
     * <p>Submit a function to be invoked on the worker's event loop thread and
     * return a future for the result.</p>
     *
     * <p>This method always returns immediately.</p>
     *
     * @param module the module id or object
     * @param function the function name or object
     * @param args optional arguments to pass to the function
     * @return a future for the return value of the function invocation
     */
    public Future<Object> submit(final Object module, final Object function,
                                 final Object... args) {
        engine.enterAsyncTask();
        return getEventLoop().submit(new Callable<Object>() {
            public Object call() throws Exception {
                try {
                    return invoke(module, function, args);
                } finally {
                    engine.exitAsyncTask();
                }
            }
        });
    }

    /**
     * <p>Submit a function to be invoked on the worker's event loop thread
     * with the given delay and arguments, returning a future for the result.</p>
     *
     * <p>This method always returns immediately.</p>
     *
     * @param delay the delay in milliseconds
     * @param module the module id or object
     * @param function the function name or object
     * @param args optional arguments to pass to the function
     * @return a future for the return value of the function invocation
     */
    public ScheduledFuture<Object> schedule(long delay, final Object module,
                                            final Object function,
                                            final Object... args) {
        engine.enterAsyncTask();
        return getEventLoop().schedule(new Callable<Object>() {
            public Object call() throws Exception {
                try {
                    return invoke(module, function, args);
                } finally {
                    engine.exitAsyncTask();
                }
            }
        }, delay, TimeUnit.MILLISECONDS);
    }

    /**
     * <p>Submit a function to be invoked repeatedly with the given interval
     * on the worker's event loop thread, returning a future for the result.</p>
     *
     * <p>This method always returns immediately.</p>
     *
     * @param interval the interval in milliseconds
     * @param module the module id or object
     * @param function the function name or object
     * @param args optional arguments to pass to the function
     * @return a future for the return value of the function invocation
     */
    public ScheduledFuture<?> scheduleInterval(long interval, final Object module,
                                               final Object function,
                                               final Object... args) {
        engine.enterAsyncTask();
        return getEventLoop().scheduleWithFixedDelay(new Runnable() {
            public void run() {
                try {
                    invoke(module, function, args);
                } catch (Exception x) {
                    throw new RuntimeException(x);
                }
            }
        }, interval, interval, TimeUnit.MILLISECONDS);
    }

    /**
     * Load a module in the worker's event loop thread, returning a future for
     * the loaded module.
     * @param module the module id
     * @return the loaded module
     */
    public Future<Object> loadModuleInWorkerThread(final String module) {
        engine.enterAsyncTask();
        return getEventLoop().submit(new Callable<Object>() {
            public Object call() throws Exception {
                if (reload) checkedModules.clear();
                Context cx = engine.getContextFactory().enterContext(null);
                try {
                    return loadModule(cx, module, null);
                } finally {
                    Context.exit();
                    engine.exitAsyncTask();
                }
            }
        });
    }

    /**
     * Cancel a scheduled call.
     * @param future the future
     */
    public void cancel(Future<?> future) {
        if (future.cancel(false)) {
            engine.exitAsyncTask();
        }
    }

    /**
     * Load a Javascript module into a module scope. This checks if the module
     * has already been loaded in the current context and if so returns the
     * existing module scope.
     * @param cx the current context
     * @param moduleName the module name
     * @param loadingScope the scope requesting the module
     * @return the loaded module's scope
     * @throws IOException indicates that in input/output related error occurred
     */
    public Scriptable loadModule(Context cx, String moduleName,
                                 Scriptable loadingScope)
            throws IOException {
        Repository local = engine.getParentRepository(loadingScope);
        ReloadableScript script = engine.getScript(moduleName, local);

        // check if we already came across the module in the current context/request
        if (checkedModules.containsKey(script.resource)) {
            return checkedModules.get(script.resource);
        }

        // check if module has been loaded before
        Scriptable module = modules.get(script.resource);
        ReloadableScript parent = currentScript;
        RingoWorker previous = acquireWorker();
        try {
            currentScript = script;
            module = script.load(engine.getScope(), cx, module, this);
            modules.put(script.resource, module);
        } finally {
            currentScript = parent;
            releaseWorker(previous);
            if (parent != null) {
                parent.addDependency(script);
            }
        }

        return module;
    }

    /**
     * Add a resource/scope pair to our map of known up-to-date modules.
     * @param resource a resource
     * @param module the module scope
     */
    protected void registerModule(Resource resource, Scriptable module) {
        checkedModules.put(resource, module);
    }

    /**
     * Evaluate a script within a given scope.
     * @param cx the current context
     * @param script the script
     * @param scope the scope
     * @return the value returned by the script
     * @throws IOException an I/O related error occurred
     */
    public Object evaluateScript(Context cx,
                                 ReloadableScript script,
                                 Scriptable scope)
            throws IOException {
        Object result;
        ReloadableScript parent = currentScript;
        errors = new LinkedList<ScriptError>();
        RingoWorker previous = acquireWorker();
        try {
            currentScript = script;
            result = script.evaluate(scope, cx, this);
            modules.put(script.resource, scope);
        } finally {
            currentScript = parent;
            releaseWorker(previous);
            if (parent != null) {
                parent.addDependency(script);
            }
        }
        return result;
    }

    /**
     * Returns true if this worker will reload modified modules between
     * invocations.
     * @return true if module reloading is enabled
     */
    public boolean isReloading() {
        return reload;
    }

    /**
     * Enable or disable reloading of modified modules for this worker.
     * @param reload true to enable module reloading
     */
    public void setReloading(boolean reload) {
        if (reload != this.reload) {
            checkedModules = reload ? new HashMap<Resource, Scriptable>() : modules;
        }
        this.reload = reload;
    }

    /**
     * Get the current error listener for uncaught errors in this worker
     * @return the error listener
     */
    public Function getErrorListener() {
        return errorListener;
    }

    /**
     * Set the error listener to handle uncaught errors in this worker
     * @param errorListener the error listener
     */
    public void setErrorListener(Function errorListener) {
        this.errorListener = errorListener;
    }

    /**
     * Get the worker's engine.
     * @return the engine
     */
    public RhinoEngine getEngine() {
        return engine;
    }

    /**
     * Get a list of errors encountered in the last invocation of this worker.
     * @return a list of errors
     */
    public List<ScriptError> getErrors() {
        return errors;
    }

    /**
     * Count the number of scheduled calls in this worker.
     * @return the number of scheduled calls
     */
    public long countScheduledTasks() {
        EventLoop eventloop = this.eventloop;
        return eventloop == null ? 0 : eventloop.getQueue().size();
    }

    /**
     * Returns true if this worker is currently running.
     * @return true if worker is active
     */
    public boolean isActive() {
        if (runlock.isLocked()) {
            return true;
        }
        EventLoop eventloop = this.eventloop;
        if (eventloop != null) {
            Delayed task = (Delayed)eventloop.getQueue().peek();
            if (task != null && task.getDelay(TimeUnit.MILLISECONDS) < 1l) {
                return true;
            }
        }
        return false;
    }

    /**
     * Immediately shut down this worker's event loop.
     */
    public synchronized void shutdown() {
        EventLoop eventloop = this.eventloop;
        if (eventloop != null) {
            eventloop.shutdownNow();
            this.eventloop = null;
        }
    }

    /**
     * Release the worker, returning it to the engine's worker pool.
     */
    public void release() {
        engine.returnWorker(this);
    }
    
    /**
     * Schedule a task that will release this worker when the current task
     * is finished, returning it back into the engine's worker pool.
     */
    public void releaseWhenDone() {
        if (isActive()) {
            getEventLoop().submit(new Runnable() {
                public void run() {
                    release();
                }
            });
        } else {
            release();
        }
    }

    /**
     * Associate this worker with the current thread, making sure no other
     * thread currently owns this worker. Returns the worker previously
     * associated with this thread, if any.
     * @return the worker previously associated with this thread, or null
     */
    private RingoWorker acquireWorker() {
        runlock.lock();
        return engine.setCurrentWorker(this);
    }

    /**
     * Release this worker from the current thread, and set the worker
     * associated with the current thread to the previous worker.
     * @param previous the worker previously associated with this thread
     */
    private void releaseWorker(RingoWorker previous) {
        engine.setCurrentWorker(previous);
        runlock.unlock();
    }

    // init the worker's event loop
    private synchronized EventLoop getEventLoop() {
        if (eventloop == null) {
            eventloop = new EventLoop(id);
        }
        return eventloop;
    }

    static class EventLoop extends ScheduledThreadPoolExecutor {
        EventLoop(final int id) {
            super(1, new ThreadFactory() {
                public Thread newThread(Runnable runnable) {
                    Thread thread = new Thread(runnable, "ringo-worker-" + id);
                    thread.setDaemon(true);
                    return thread;
                }
            });
            // Allow event loop threads to time out, allowing workers to
            // be garbage collected. If a worker is still used after its thread
            // timed out a new thread will be created.
            setKeepAliveTime(60000, TimeUnit.MILLISECONDS);
            allowCoreThreadTimeOut(true);
        }
    }

}
