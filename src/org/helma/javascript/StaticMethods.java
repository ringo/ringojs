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
        try {
            ScriptUtils.checkArguments(args, 3, 3);
            ScriptableObject obj = ScriptUtils.getScriptableArgument(args, 0, false);
            String propname = ScriptUtils.getStringArgument(args, 1, false);
            Scriptable desc = ScriptUtils.getScriptableArgument(args, 2, false);
            PropertyDescriptor propDesc = new PropertyDescriptor(desc);
            propDesc.defineProperty(obj, propname);
        } catch (IllegalArgumentException illarg) {
            throw ScriptRuntime.typeError(illarg.getMessage());
        }
    }


    static class PropertyDescriptor {
        public final Object value;
        public final Callable getter, setter;
        public final boolean enumerable, configurable, writable;

        public PropertyDescriptor(Scriptable desc) {
            enumerable = ScriptRuntime.toBoolean(getDescriptorValue("enumerable", desc));
            configurable = ScriptRuntime.toBoolean(getDescriptorValue("configurable", desc));
            value = getDescriptorValue("value", desc);
            Object writeableObj = getDescriptorValue("writable", desc);
            writable = ScriptRuntime.toBoolean(writeableObj);
            getter = (Callable) getDescriptorValue("get", desc);
            setter = (Callable) getDescriptorValue("set", desc);
            if ((value != null || writeableObj != null) && (getter != null || setter != null)) {
                throw ScriptRuntime.typeError("Mixed value/writable with get/set in PropertyDescriptor");
            }
        }

        public Object getDescriptorValue(String propName, Scriptable desc) {
            Object value = desc.get(propName, desc);
            if (value == Undefined.instance || value == UniqueTag.NOT_FOUND) {
                return null;
            }
            return value;
        }

        public int getAttributes() {
            int attr = 0;
            if (!enumerable) attr |= ScriptableObject.DONTENUM;
            if (!configurable) attr |= ScriptableObject.PERMANENT;
            if (getter == null && setter == null) {
                if (!writable) attr |= ScriptableObject.READONLY;
            }
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
            } else if (value != null) {
                obj.defineProperty(propname, value, getAttributes());
            }

        }
    }

}