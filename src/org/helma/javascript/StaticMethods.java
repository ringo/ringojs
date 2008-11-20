/*
 *  Copyright 2008 Hannes Wallnoefer <hannes@helma.at>
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

import org.helma.util.ScriptUtils;
import org.mozilla.javascript.*;

import java.util.Map;

/**
 * This class contains the native functions Helma adds to the global scope.
 */
public class StaticMethods {

    /**
     * Init functions on a new top level scope
     * @param scope the global scope
     */
    public static void init(ScriptableObject scope) {
        ScriptableObject objCtor = (ScriptableObject) scope.get("Object", scope);
        objCtor.defineFunctionProperties(
                new String[] {
                        "defineProperty"
                },
                StaticMethods.class,
                ScriptableObject.DONTENUM | ScriptableObject.PERMANENT | ScriptableObject.READONLY);
    }

    /**
     * Evaluate a JavaScript resource.
     * @param cx the current context
     * @param thisObj the object the function is called on
     * @param args the arguments
     * @param funObj the function object
     * @throws org.mozilla.javascript.JavaScriptException javascript evaluation error
     */
    public static void defineProperty(Context cx, Scriptable thisObj, Object[] args, Function funObj)
            throws JavaScriptException {
        ScriptUtils.checkArguments(args, 3, 3);
        ScriptableObject obj = ScriptUtils.getScriptableArgument(args, 0);
        String propname = ScriptUtils.getStringArgument(args, 1);
        Map desc = ScriptUtils.getMapArgument(args, 2);
        if (obj == null || propname == null || desc == null) {
            throw new IllegalArgumentException();
        }
        PropertyDescriptor propDesc = new PropertyDescriptor(desc);
        propDesc.defineProperty(obj, propname);
    }


    static class PropertyDescriptor {
        public final Object value;
        public final Callable getter, setter;
        public final boolean enumerable, configurable, writable;

        public PropertyDescriptor(Map desc) {
            value = desc.get("value");
            getter = (Callable) desc.get("getter");
            setter = (Callable) desc.get("setter");
            enumerable = ScriptRuntime.toBoolean(desc.get("enumerable"));
            configurable = ScriptRuntime.toBoolean(desc.get("configurable"));
            writable = ScriptRuntime.toBoolean(desc.get("writable"));
            if (value != null && (getter != null || setter != null)) {
                throw new IllegalArgumentException("Only one of value or getter/setter must be defined");
            }
        }

        public int getAttributes() {
            int attr = 0;
            if (!enumerable) attr |= ScriptableObject.DONTENUM;
            if (!writable) attr |= ScriptableObject.READONLY;
            if (!configurable) attr |= ScriptableObject.PERMANENT;
            return attr;
        }

        public void defineProperty(ScriptableObject obj, String propname) {
            if (getter != null || setter != null) {
                if (getter != null) {
                    obj.setGetterOrSetter(propname, 0, getter, false);
                }
                if (setter != null) {
                    obj.setGetterOrSetter(propname, 0, setter, true);
                }
                obj.setAttributes(propname, getAttributes());
            } else {
                obj.defineProperty(propname, value, getAttributes());
            }

        }
    }

}