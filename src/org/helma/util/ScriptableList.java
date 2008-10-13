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

import java.util.List;
import java.util.ArrayList;

/**
 * ScriptableList is a wrapper for java.util.List instances that allows developers 
 * to interact with them like it was a native JavaScript array.
 * @desc Wraps a Java List into a JavaScript Array
 */
public class ScriptableList extends NativeJavaObject {

    List list;
    static final String CLASSNAME = "ScriptableList";

    // Set up a custom constructor, for this class is somewhere between a host class and
    // a native wrapper, for which no standard constructor class exists
    public static void init(Scriptable scope) throws NoSuchMethodException {
        BaseFunction ctor = new BaseFunction(scope, ScriptableObject.getFunctionPrototype(scope)) {
            public Scriptable construct(Context cx, Scriptable scope, Object[] args) {
                if (args.length != 1) {
                    throw new EvaluatorException("ScriptableList() requires a java.util.List argument");
                }
                return new ScriptableList(scope, args[0]);
            }
        };
        ScriptableObject.defineProperty(scope, CLASSNAME, ctor,
                ScriptableObject.DONTENUM | ScriptableObject.READONLY);
    }

    /**
     * Create a ScriptableList wrapper around a java.util.List
     * @param scope the scope
     * @param obj the list, possibly wrapped
     */
    private ScriptableList(Scriptable scope, Object obj) {
        this.parent = scope;
        if (obj instanceof Wrapper) {
            obj = ((Wrapper) obj).unwrap();
        }
        if (obj instanceof List) {
            this.javaObject = this.list = (List) obj;
        } else if (obj == Undefined.instance) {
            this.javaObject = this.list = new ArrayList();
        } else {
            throw new EvaluatorException("Invalid argument to ScriptableList(): " + obj);
        }
        this.staticType = this.list.getClass();
        initMembers();
        initPrototype(scope);
    }


    /**
     * Create a ScriptableList wrapper around a java.util.List.
     * @param scope the scope
     * @param list the list instance
     */
    public ScriptableList(Scriptable scope, List list) {
        super(scope, list, list.getClass());
        this.list = list;
        initPrototype(scope);
    }

    /**
     * Set the prototype to the Array prototype so we can use array methds such as
     * push, pop, shift, slice etc.
     * @param scope the global scope for looking up the Array constructor
     */
    protected void initPrototype(Scriptable scope) {
        Scriptable arrayProto = ScriptableObject.getClassPrototype(scope, "Array");
        if (arrayProto != null) {
            this.setPrototype(arrayProto);
        }
    }

    public void delete(int index) {
        if (list != null) {
            try {
                list.remove(index);
            } catch (RuntimeException e) {
                throw Context.throwAsScriptRuntimeEx(e);
            }
        } else {
            super.delete(index);
        }
    }

    public Object get(int index, Scriptable start) {
        if (list == null)
            return super.get(index, start);
        try {
            if (index < 0 || index >= list.size()) {
                return Undefined.instance;
            } else {
                return ScriptUtils.javaToJS(list.get(index), getParentScope());
            }
        } catch (RuntimeException e) {
            throw Context.throwAsScriptRuntimeEx(e);
        }
    }

    public boolean has(int index, Scriptable start) {
        if (list == null)
            return super.has(index, start);
        return index >= 0 && index < list.size();
    }

    public void put(int index, Scriptable start, Object value) {
        if (list != null) {
            try {
                if (index == list.size()) {
                    list.add(Context.jsToJava(value, ScriptRuntime.ObjectClass));
                } else {
                    list.set(index, Context.jsToJava(value, ScriptRuntime.ObjectClass));
                }
            } catch (RuntimeException e) {
                Context.throwAsScriptRuntimeEx(e);
            }
        } else {
            super.put(index, start, value);
        }
    }

    public Object get(String name, Scriptable start) {
        if ("length".equals(name) && list != null) {
            return new Integer(list.size());
        }
        return super.get(name, start);
    }

    public Object[] getIds() {
        if (list == null)
            return super.getIds();
        int size = list.size();
        Object[] ids = new Object[size];
        for (int i = 0; i < size; ++i) {
            ids[i] = new Integer(i);
        }
        return ids;
    }

    public String toString() {
        if (list == null)
            return super.toString();
        return list.toString();
    }

    public Object getDefaultValue(Class typeHint) {
        return toString();
    }

    public Object unwrap() {
        return list;
    }

    public List getList() {
        return list;
    }

    public String getClassName() {
        return CLASSNAME;
    }
}