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

import org.mozilla.javascript.*;
import org.helma.repository.Resource;
import org.helma.repository.Repository;

/**
 * A scriptable object that keeps track of the resource it has been loaded from
 * so requests to load other stuff can look for local resources.
 */
public class ModuleScope extends NativeObject {

    Resource resource;
    ModuleScope ownerScope;
    boolean hasAdapterFunctions;
    AdapterFlag isAdapter = new AdapterFlag();

    public ModuleScope(Resource resource, ModuleScope owner, Scriptable prototype) {
        this.resource = resource;
        this.ownerScope = owner;
        setParentScope(null);
        setPrototype(prototype);
    }

    public Resource getResource() {
        return resource;
    }

    public Repository getRepository() {
        return resource.getRepository();
    }

    public ModuleScope getOwner() {
        return ownerScope;
    }

    public String toString() {
        return "[ModuleScope " + resource + "]";
    }

    public Object getDefaultValue(Class hint) {
        if (hint == String.class) {
            return toString();
        }
        return super.getDefaultValue(hint);
    }

    public void setHasAdapterFunctions(boolean adapter) {
        this.hasAdapterFunctions = adapter;
        isAdapter = new AdapterFlag();
    }

    public boolean getHasAdapterFunctions() {
        return hasAdapterFunctions;
    }

    public Object get(String name, Scriptable start) {
        // System.err.println(" IIAA GG " + isAdapter.get() + " ::: " + hasAdapterFunctions);
        if (isAdapter.get()) {
            Function func = getAdapteeFunction(GET_PROP);
            if (func != null) {
                return call(func, new Object[] { name });
            }
        }
        return super.get(name, start);
    }

    public Object get(int index, Scriptable start) {
        if (isAdapter.get()) {
            Function func = getAdapteeFunction(GET_PROP);
            if (func != null) {
                return call(func, new Object[] { index });
            }
        }
        return super.get(index, start);
    }

    public boolean has(String name, Scriptable start) {
        if (isAdapter.get()) {
            Function func = getAdapteeFunction(HAS_PROP);
            if (func != null) {
                Object res = call(func, new Object[] { name });
                return Context.toBoolean(res);
            }
        }
        return super.has(name, start);
    }

    public boolean has(int index, Scriptable start) {
        if (isAdapter.get()) {
            Function func = getAdapteeFunction(HAS_PROP);
            if (func != null) {
                Object res = call(func, new Object[] { index });
                return Context.toBoolean(res);
            }
        }
        return super.has(index, start);
    }

    public void put(String name, Scriptable start, Object value) {
        if (start == this) {
            if (isAdapter.get()) {
                Function func = getAdapteeFunction(PUT_PROP);
                if (func != null) {
                    call(func, new Object[] { name, value });
                    return;
                }
            }
            super.put(name, start, value);
        } else {
            start.put(name, start, value);
        }
    }

    public void put(int index, Scriptable start, Object value) {
        if (start == this) {
            if (isAdapter.get()) {
                Function func = getAdapteeFunction(PUT_PROP);
                if( func != null) {
                    call(func, new Object[] { index, value });
                    return;
                }
            }
            super.put(index, start, value);
        } else {
            start.put(index, start, value);
        }
    }

    public void delete(String name) {
        if (isAdapter.get()) {
            Function func = getAdapteeFunction(DEL_PROP);
            if (func != null) {
                call(func, new Object[] { name });
                return;
            }
        }
        super.delete(name);
    }

    public void delete(int index) {
        if (isAdapter.get()) {
            Function func = getAdapteeFunction(DEL_PROP);
            if (func != null) {
                call(func, new Object[] { index });
                return;
            }
        }
        super.delete(index);
    }

    public Object[] getIds() {
        if (isAdapter.get()) {
            Function func = getAdapteeFunction(GET_PROPIDS);
            if (func != null) {
                Object val = call(func, new Object[0]);
                // in most cases, adaptee would return native JS array
                if (val instanceof NativeArray) {
                    NativeArray array = (NativeArray) val;
                    Object[] res = new Object[(int)array.getLength()];
                    for (int index = 0; index < res.length; index++) {
                        res[index] = mapToId(array.get(index, array));
                    }
                    return res;
                } else if (val instanceof NativeJavaArray) {
                    // may be attempt wrapped Java array
                    Object tmp = ((NativeJavaArray)val).unwrap();
                    Object[] res;
                    if (tmp.getClass() == Object[].class) {
                        Object[]  array = (Object[]) tmp;
                        res = new Object[array.length];
                        for (int index = 0; index < array.length; index++) {
                            res[index] = mapToId(array[index]);
                        }
                    } else {
                        // just return an empty array
                        res = Context.emptyArgs;
                    }
                    return res;
                } else {
                    // some other return type, just return empty array
                    return Context.emptyArgs;
                }
            }
        }
        return super.getIds();
    }

    private Function getAdapteeFunction(String name) {
        Object o = super.get(name, this);
        if (o instanceof Function) return (Function) o;
        Scriptable proto = getPrototype();
        if (proto != null) {
            o = ScriptableObject.getProperty(proto, name);
        }
        return (o instanceof Function)? (Function)o : null;
    }

    private Object call(Function func, Object[] args) {
        Context cx = Context.getCurrentContext();
        try {
            isAdapter.set(false);
            return func.call(cx, this, this, args);
        } catch (RhinoException re) {
            throw Context.reportRuntimeError(re.getMessage());
        } finally {
            isAdapter.set(true);
        }
    }

    // map a property id. Property id can only be an Integer or String
    private Object mapToId(Object tmp) {
        if (tmp instanceof Number) {
            return ((Number)tmp).intValue();
        } else {
            return Context.toString(tmp);
        }
    }

    class AdapterFlag extends ThreadLocal<Boolean> {
        protected Boolean initialValue() {
            return hasAdapterFunctions;
        }
    }    

    // names of adaptee JavaScript functions
    private static final String GET_PROP = "__get__";
    private static final String HAS_PROP = "__has__";
    private static final String PUT_PROP = "__put__";
    private static final String DEL_PROP = "__delete__";
    private static final String GET_PROPIDS = "__getIds__";

}
