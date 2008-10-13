/*
 *  Copyright 2006 Hannes Wallnoefer <hannes@helma.at>
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

package org.helma.util;

import org.mozilla.javascript.*;

import java.util.Map;
import java.util.HashMap;
import java.lang.reflect.Constructor;

/**
 * ScriptableMap is a wrapper for java.util.Map instances that allows developers
 * to interact with them as if it were a native JavaScript object.
 * @desc Wraps a Java Map into a JavaScript Object
 */
public class ScriptableMap extends ScriptableObject implements Wrapper {

    Map map;
    final static String CLASSNAME = "ScriptableMap";

    public static void init(Scriptable scope) throws NoSuchMethodException {
        Constructor cnst = ScriptableMap.class.getConstructor(Object.class);
        FunctionObject jsCnst = new FunctionObject(CLASSNAME, cnst, scope);
        jsCnst.addAsConstructor(scope, new ScriptableMap(scope, null));
    }

    public ScriptableMap(Object obj) {
        if (obj instanceof Wrapper) {
            obj = ((Wrapper) obj).unwrap();
        }
        if (obj instanceof Map) {
            this.map = (Map) obj;
        } else if (obj == Undefined.instance) {
            this.map = new HashMap();
        } else if (obj instanceof Scriptable) {
            this.map = new HashMap();
            Scriptable s = (Scriptable) obj;
            Object[] ids = s.getIds();
            for (Object id: ids) {
                if (id instanceof String) {
                    map.put(id, s.get((String)id, s));
                } else if (id instanceof Number) {
                    map.put(id, s.get(((Number)id).intValue(), s));
                }
            }
        } else {
            throw new EvaluatorException("Invalid argument to ScriptableMap(): " + obj);
        }
    }

    public ScriptableMap(Scriptable scope, Map map) {
        super(scope, ScriptUtils.getClassOrObjectProto(scope, CLASSNAME));
        this.map = map;
    }

    public Object get(String name, Scriptable start) {
        if (map == null)
            return super.get(name, start);
        return get(name);
    }

    public Object get(int index, Scriptable start) {
        if (map == null)
            return super.get(index, start);
        return get(new Integer(index));
    }

    private Object get(Object key) {
        Object value = map.get(key);
        if (value == null) {
            return Scriptable.NOT_FOUND;
        }
        return ScriptUtils.javaToJS(value, getParentScope());
    }

    public boolean has(String name, Scriptable start) {
        if (map == null) {
            return super.has(name, start);
        } else {
            return map.containsKey(name);
        }
    }

    public boolean has(int index, Scriptable start) {
        if (map == null) {
            return super.has(index, start);
        } else {
            return map.containsKey(new Integer(index));
        }
    }

    public void put(String name, Scriptable start, Object value) {
        if (map != null) {
            put(name, value);
        } else {
            super.put(name, start, value);
        }
    }

    public void put(int index, Scriptable start, Object value) {
        if (map != null) {
            put(new Integer(index), value);
       } else {
            super.put(index, start, value);
        }
    }

    private void put(Object key, Object value) {
        try {
            map.put(key, Context.jsToJava(value,
                    ScriptRuntime.ObjectClass));
        } catch (RuntimeException e) {
            Context.throwAsScriptRuntimeEx(e);
        }
    }

    public void delete(String name) {
        if (map != null) {
            try {
                map.remove(name);
            } catch (RuntimeException e) {
                Context.throwAsScriptRuntimeEx(e);
            }
        } else {
            super.delete(name);
        }
    }

    public void delete(int index) {
        if (map != null) {
            try {
                map.remove(new Integer(index));
            } catch (RuntimeException e) {
                Context.throwAsScriptRuntimeEx(e);
            }
        } else {
            super.delete(index);
        }
    }

    public Object[] getIds() {
        if (map == null) {
            return super.getIds();
        } else {
            return map.keySet().toArray();
        }
    }

    public String toString() {
        if (map == null)
            return super.toString();
        return map.toString();
    }

    public Object getDefaultValue(Class typeHint) {
        return toString();
    }
    
    public Object unwrap() {
        return map;
    }

    public Map getMap() {
        return map;
    }

    public String getClassName() {
        return CLASSNAME;
    }
}