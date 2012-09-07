/*
 *  Copyright 2012 Hannes Wallnoefer <hannes@helma.at>
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
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

/**
 * This class represents a JavaScript callback function.
 *
 * Callbacks can either be plain JavaScript functions, in which case they
 * are invoked in their original worker, or an object containing properties
 * called `module` and `name` specifying a function with the given name
 * exported by the given module, in which case it can be invoked on any worker.
 */

public class Callback {
    RhinoEngine engine;
    RingoWorker worker;
    final Object module;
    final Object function;
    final boolean sync;

    /**
     * @param function either a JavaScript function or a JavaScript object
     *                 containing properties called `module` and `name`
     *                 specifying a function exported by a RingoJS module.
     * @param engine the RhinoEngine instance
     * @param sync whether to invoke the callback synchronously (on the current
     *             thread) or asynchronously (on the worker's event loop thread)
     */
    public Callback(Scriptable function, RhinoEngine engine, boolean sync) {
        this.engine = engine;
        Scriptable scope = ScriptableObject.getTopLevelScope(function);
        if (function instanceof Function) {
            this.module = scope;
            this.function = function;
            worker = engine.getCurrentWorker();
            if (worker == null) {
                worker = engine.getWorker();
            }
        } else {
            this.module = ScriptableObject.getProperty(function, "module");
            this.function = ScriptableObject.getProperty(function, "name");
            if (module == Scriptable.NOT_FOUND || module == null) {
                throw Context.reportRuntimeError(
                        "Callback object must contain 'module' property");
            }
            if (this.function == Scriptable.NOT_FOUND || this.function == null) {
                throw Context.reportRuntimeError(
                        "Callback object must contain 'name' property");
            }
            this.worker = null;
        }
        this.sync = sync;
    }

    /**
     * Tests whether the argument is a callback and represents the same
     * function as this callback.
     * @param callback a JavaScript function or object
     * @return true if the callbacks represent the same function.
     */
    public boolean equalsCallback(Scriptable callback) {
        if (callback instanceof Function) {
            return function == callback;
        } else {
            return module.equals(ScriptableObject.getProperty(callback, "module"))
                && function.equals(ScriptableObject.getProperty(callback, "name"));
        }
    }

    /**
     * Invokes the callback with the given arguments, returning the return value
     * or a future depending on whether this Callback is synchronous or not.
     *
     * @param args arguments to pass to the callback.
     * @return the result if the callback is synchronous, or a
     * {@link java.util.concurrent.Future} that will resolve to the invocation
     * in case it is an asynchronous callback.
     */
    public Object invoke(Object... args) {
        if (this.worker == null) {
            RingoWorker worker = engine.getWorker();
            try {
                return invokeWithWorker(worker, args);
            } finally {
                if (sync)
                    worker.release();
                else
                    worker.releaseWhenDone();
            }
        } else {
            return invokeWithWorker(this.worker, args);
        }
    }

    private Object invokeWithWorker(RingoWorker worker, Object... args) {
        if (sync) {
            try {
                return worker.invoke(module, function, args);
            } catch (Exception x) {
                throw new RuntimeException(x);
            }
        } else {
            return worker.submit(module, function, args);
        }
    }
}

