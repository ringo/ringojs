/*
 *  Copyright 2009 the Helma Project
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

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextAction;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.NativeJavaClass;
import org.mozilla.javascript.NativeJavaObject;
import org.mozilla.javascript.RhinoException;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;
import org.mozilla.javascript.WrappedException;
import org.mozilla.javascript.Wrapper;
import org.ringojs.repository.Repository;
import org.ringojs.repository.Trackable;
import org.ringojs.util.ScriptUtils;
import org.mozilla.javascript.tools.shell.Global;
import org.ringojs.wrappers.ModulePath;
import org.ringojs.repository.Resource;

import java.lang.reflect.InvocationTargetException;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.io.IOException;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

public class RingoGlobal extends Global {

    private static ExecutorService threadPool;
    private static AtomicInteger ids = new AtomicInteger();

    protected RingoGlobal() {}

    public RingoGlobal(Context cx, RhinoEngine engine, boolean sealed) {
        init(cx, engine, sealed);
    }

    public void init(Context cx, RhinoEngine engine, boolean sealed) {
        // Define some global functions particular to the shell. Note
        // that these functions are not part of ECMA.
        initStandardObjects(cx, sealed);
        String[] names = {
            "doctest",
            "gc",
            "load",
            "loadClass",
            "print",
            "quit",
            "readFile",
            "readUrl",
            "runCommand",
            "seal",
            "sync",
            "toint32",
            "version",
        };
        defineFunctionProperties(names, Global.class,
                                 ScriptableObject.DONTENUM);
        names = new String[] {
            "defineClass",
            "require",
            "getResource",
            "getRepository",
            "addToClasspath",
            "privileged",
            "spawn",
            "trycatch"
        };
        defineFunctionProperties(names, RingoGlobal.class,
                                 ScriptableObject.DONTENUM);

        ScriptableObject require = (ScriptableObject) get("require", this);
        // Set up require.main property as setter - note that accessing this will cause
        // the main module to be loaded, which may result in problems if engine setup
        // isn't finished yet. Alas, the Securable Modules spec requires us to do this.
        require.defineProperty("main", RingoGlobal.class,
                DONTENUM | PERMANENT | READONLY);
        require.defineProperty("paths", new ModulePath(engine.getRepositories(), this),
                DONTENUM | PERMANENT | READONLY);
        defineProperty("arguments", cx.newArray(this, engine.getArguments()), DONTENUM);
    }

    public static void defineClass(final Context cx, Scriptable thisObj,
                                     Object[] args, Function funObj)
            throws IllegalAccessException, InstantiationException, InvocationTargetException {
        ScriptUtils.checkArguments(args, 1, 1);
        Object arg = args[0] instanceof Wrapper ? ((Wrapper) args[0]).unwrap() : args[0];
        if (!(arg instanceof Class)) {
            throw Context.reportRuntimeError("defineClass() requires a class argument");
        }
        RhinoEngine engine = RhinoEngine.engines.get();
        engine.defineHostClass((Class) arg);
    }

    public static Object require(final Context cx, Scriptable thisObj,
                                 Object[] args, Function funObj) {
        if (args.length != 1 || !(args[0] instanceof String)) {
            throw Context.reportRuntimeError("require() requires a string argument");
        }
        RhinoEngine engine = RhinoEngine.engines.get();
        ModuleScope moduleScope = thisObj instanceof ModuleScope ?
                (ModuleScope) thisObj : null;
        try {
            ModuleScope module = engine.loadModule(cx, (String) args[0], moduleScope);
            return module.getExports();
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public static Object getResource(final Context cx, Scriptable thisObj, Object[] args,
                                     Function funObj) {
        if (args.length != 1 || !(args[0] instanceof String)) {
            throw Context.reportRuntimeError("getResource() requires a string argument");
        }
        RhinoEngine engine = RhinoEngine.engines.get();
        try {
            Resource res = engine.findResource((String) args[0],
                    engine.getParentRepository(thisObj));
            return cx.getWrapFactory().wrapAsJavaObject(cx, engine.getScope(), res, null);
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public static Object getRepository(final Context cx, Scriptable thisObj, Object[] args,
                                     Function funObj) {
        if (args.length != 1 || !(args[0] instanceof String)) {
            throw Context.reportRuntimeError("getResource() requires a string argument");
        }
        RhinoEngine engine = RhinoEngine.engines.get();
        try {
            Repository repo = engine.findRepository((String) args[0],
                    engine.getParentRepository(thisObj));
            return cx.getWrapFactory().wrapAsJavaObject(cx, engine.getScope(), repo, null);
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public static Object addToClasspath(final Context cx, Scriptable thisObj, Object[] args,
                                        Function funObj) {
        if (args.length != 1) {
            throw Context.reportRuntimeError("addToClasspath() requires an argument");
        }
        try {
            Trackable path;
            RhinoEngine engine = RhinoEngine.engines.get();
            Object arg = args[0] instanceof Wrapper ?
                    ((Wrapper) args[0]).unwrap() : args[0];
            if (arg instanceof String) {
                path = engine.findPath((String) arg,
                        engine.getParentRepository(thisObj));
            } else if (arg instanceof Trackable) {
                path = (Trackable) arg;
            } else {
                throw Context.reportRuntimeError("addToClasspath() requires a path argument");
            }
            engine.addToClasspath(path);
            return path.exists() ? Boolean.TRUE : Boolean.FALSE;
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public static Object privileged(final Context cx, Scriptable thisObj, Object[] args,
                                    Function funObj) {
        if (args.length != 1 || !(args[0] instanceof Function)) {
            throw Context.reportRuntimeError("privileged() requires a function argument");
        }
        final Scriptable scope = getTopLevelScope(thisObj);
        Scriptable s = cx.newObject(scope);
        s.put("run", s, args[0]);
        final Object[] jargs = {new NativeJavaClass(scope, PrivilegedAction.class), s};
        PrivilegedAction action = AccessController.doPrivileged(
                new PrivilegedAction<PrivilegedAction>() {
                    public PrivilegedAction run() {
                        return (PrivilegedAction) ((Wrapper) cx.newObject(scope, "JavaAdapter", jargs)).unwrap();
                    }
                }
        );
        // PrivilegedAction action = (PrivilegedAction) InterfaceAdapter.create(cx, PrivilegedAction.class, (Callable) args[0]);
        return AccessController.doPrivileged(action);
    }

    public static Object trycatch(final Context cx, Scriptable thisObj, Object[] args,
                                    Function funObj) {
        if (args.length != 1 || !(args[0] instanceof Function)) {
            throw Context.reportRuntimeError("trycatch() requires a function argument");
        }
        Scriptable scope = getTopLevelScope(thisObj);
        try {
            return ((Function)args[0]).call(cx, scope, thisObj, RhinoEngine.EMPTY_ARGS);
        } catch (RhinoException re) {
            return new NativeJavaObject(scope, re, null);
        }
    }

    public static Object spawn(final Context cx, Scriptable thisObj, Object[] args, Function funObj) {
        if (args.length < 1  || !(args[0] instanceof Function)) {
            throw Context.reportRuntimeError("spawn() requires a function argument");
        }
        final Scriptable scope = funObj.getParentScope();
        final ContextFactory cxfactory = cx.getFactory();
        final Function function = (Function) args[0];
        Object[] newArgs = null;
        if (args.length > 1 && args[1] instanceof Scriptable) {
            newArgs = cx.getElements((Scriptable) args[1]);
        }
        if (newArgs == null) { newArgs = ScriptRuntime.emptyArgs; }
        final Object[] functionArgs = newArgs;
        return getThreadPool().submit(new Callable<Object>() {
            public Object call() {
                return cxfactory.call(new ContextAction() {
                    public Object run(Context cx) {
                        return function.call(cx, scope, scope, functionArgs);
                    }
                });
            }
        });
    }


    public static Object getMain(Scriptable thisObj) {
        try {
            RhinoEngine engine = RhinoEngine.engines.get();
            ModuleScope main = engine.getMainModuleScope();
            return main != null ? main.getMetaObject() : Undefined.instance;
        } catch (Exception x) {
            return Undefined.instance;
        }
    }

    static ExecutorService getThreadPool() {
        if (threadPool != null) {
            return threadPool;
        }
        synchronized (Global.class) {
            if (threadPool == null) {
                threadPool = Executors.newCachedThreadPool(new ThreadFactory() {
                    public Thread newThread(Runnable runnable) {
                        Thread thread = new Thread(runnable,
                                "ringo-spawn-" + ids.incrementAndGet());
                        thread.setDaemon(true);
                        return thread;
                    }
                });
            }
            return threadPool;
        }
    }

}
