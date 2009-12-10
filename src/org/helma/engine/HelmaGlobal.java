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

package org.helma.engine;

import org.helma.repository.Repository;
import org.helma.repository.Trackable;
import org.helma.util.ScriptUtils;
import org.mozilla.javascript.*;
import org.mozilla.javascript.tools.shell.Global;
import org.helma.wrappers.ModulePath;
import org.helma.repository.Resource;

import java.lang.reflect.InvocationTargetException;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.io.IOException;

public class HelmaGlobal extends Global {

    protected HelmaGlobal() {}

    public HelmaGlobal(Context cx, RhinoEngine engine, boolean sealed) {
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
            "spawn",
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
            "trycatch"
        };
        defineFunctionProperties(names, HelmaGlobal.class,
                                 ScriptableObject.DONTENUM);

        ScriptableObject require = (ScriptableObject) get("require", this);
        require.defineProperty("main", engine.getMainModule(),
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
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        engine.defineHostClass((Class) arg);
    }

    public static Object require(final Context cx, Scriptable thisObj,
                                 Object[] args, Function funObj) {
        if (args.length != 1 || !(args[0] instanceof String)) {
            throw Context.reportRuntimeError("require() requires a string argument");
        }
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
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
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        ModuleScope moduleScope = thisObj instanceof ModuleScope ?
                (ModuleScope) thisObj : null;
        try {
            Resource res = engine.findResource((String) args[0],
                    engine.getParentRepository(moduleScope));
            return cx.getWrapFactory().wrapAsJavaObject(cx, engine.getTopLevelScope(), res, null);
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public static Object getRepository(final Context cx, Scriptable thisObj, Object[] args,
                                     Function funObj) {
        if (args.length != 1 || !(args[0] instanceof String)) {
            throw Context.reportRuntimeError("getResource() requires a string argument");
        }
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        ModuleScope moduleScope = thisObj instanceof ModuleScope ?
                (ModuleScope) thisObj : null;
        try {
            Repository repo = engine.findRepository((String) args[0],
                    engine.getParentRepository(moduleScope));
            return cx.getWrapFactory().wrapAsJavaObject(cx, engine.getTopLevelScope(), repo, null);
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public static Object addToClasspath(final Context cx, Scriptable thisObj, Object[] args,
                                        Function funObj) {
        if (args.length != 1 || !(args[0] instanceof String)) {
            throw Context.reportRuntimeError("addToClasspath() requires a string argument");
        }
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        ModuleScope moduleScope = thisObj instanceof ModuleScope ?
                (ModuleScope) thisObj : null;
        try {
            Trackable path = engine.findPath((String) args[0],
                    engine.getParentRepository(moduleScope));
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

}
