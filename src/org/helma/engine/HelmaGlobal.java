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

import org.mozilla.javascript.*;
import org.mozilla.javascript.tools.shell.Global;

import java.security.AccessController;
import java.security.PrivilegedAction;

public class HelmaGlobal extends Global {
    public HelmaGlobal(Context cx) {
        init(cx);
    }

    public void init(Context cx) {
        // Define some global functions particular to the shell. Note
        // that these functions are not part of ECMA.
        initStandardObjects(cx, false);
        String[] names = {
            "defineClass",
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
            "privileged",
            "trycatch"
        };
        defineFunctionProperties(names, HelmaGlobal.class,
                                 ScriptableObject.DONTENUM);
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
