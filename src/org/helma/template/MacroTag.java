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

package org.helma.template;

import org.helma.javascript.RhinoEngine;
import org.helma.util.CaseInsensitiveMap;
import org.helma.util.ScriptableList;
import org.helma.util.ScriptableMap;
import org.mozilla.javascript.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * A macro tag. Basically a list of unnamed parameters
 * and a map of named parameters.
 */
public class MacroTag extends ScriptableObject {

    String name;
    ArrayList<Object> args = new ArrayList<Object>();
    Map<String,Object> namedArgs = new CaseInsensitiveMap<String,Object>();
    MacroTag filter = null;
    int startLine;

    static final Object[] ownIds = new Object[] {"name", "parameters",
                                                 "parameterNames", "filter"};

    Object jsParams, jsNames;

    public MacroTag() {}

    public MacroTag(int line) {
        this.startLine = line;
        this.name = null;
    }

    public String getClassName() {
        return "MacroTag";
    }

    public List<Object> getArgs() {
        return args;
    }

    public Map<String,Object> getNamedArgs() {
        return namedArgs;
    }

    public void addFilter(MacroTag filter) {
        if (this.filter == null) {
            this.filter = filter;
        } else {
            this.filter.addFilter(filter);
        }
    }

    /**
     * Get the number of the line where this macro tag starts.
     */
    public int jsGet_startLine() {
        return startLine;
    }

    /**
     * The name of the macro tag.
     */
    public String jsGet_name() {
        return name;
    }


    /**
     * A Javascript array containing all parameter names in this macro tag.
     */
    public Object jsGet_parameterNames() {
        if (jsNames == null) {
            Context cx = Context.getCurrentContext();
            int size = namedArgs.size();
            Object[] values = namedArgs.keySet().toArray(new Object[size]);
            jsNames = cx.newArray(getTopLevelScope(this), values);
        }
        return jsNames;
    }

    /**
     * A Javascript array containing all unnamed parameters in this macro tag, in the
     * order in which they appear in the tag.
     */
    public Object jsGet_parameters() {
        if (jsParams == null) {
            Context cx = Context.getCurrentContext();
            int size = args.size();
            Object[] values = args.toArray(new Object[size]);
            jsParams = cx.newArray(getTopLevelScope(this), values);
        }
        return jsParams;
    }

    /**
     * The next macro tag in the filter chain, or undefined if the macro tag does not contain
     * a filter chain. The filter chain is defined by the pipe character '|' within within macro tags.
     */
    public Object jsGet_filter() {
        if (filter != null) {
            filter.setParentScope(getParentScope());
            filter.setPrototype(getPrototype());
            return filter;
        } else {
            return NOT_FOUND;
        }
    }

    public Object[] getIds() {
        Object[] ids = super.getIds();
        Object[] result = new Object[ownIds.length + ids.length];
        System.arraycopy(ownIds, 0, result, 0, ownIds.length);
        System.arraycopy(ids, 0, result, ownIds.length, ids.length);
        return result;
    }

    public boolean has(String name, Scriptable start) {
        return "name".equals(name) ||
                "parameters".equals(name) ||
                "parameterNames".equals(name) || super.has(name, start);
    }

    /**
     * Get a named or unnamed parameter from the macro tag. This method takes a variable
     * number of string or integer arguments. It evaluates the arguments as parameter
     * names or parameter indices until a parameter is found and returns it. If the
     * arguments don't match a parameter, the method returns null.
     * @rhinoparam nameOrIndex StringOrInteger one or more parameter names or indices.
     * @return Object The first parameter that matches one of the arguments.
     */
    public static Object jsFunction_getParameter(Context cx, Scriptable thisObj,
                                      Object[] args, Function funObj) {
        try {
            MacroTag macro = (MacroTag) thisObj;
            Object value = macro.lookupParameter(args);
            Scriptable scope = ScriptableObject.getTopLevelScope(thisObj); 
            if (value instanceof List) {
                return new ScriptableList(scope, (List) value);
            } else if (value instanceof Map) {
                return new ScriptableMap(scope, (Map) value);
            } else if (value instanceof MacroTag) {
                return RhinoEngine.wrapArgument(value, scope);
            } else {
                return Context.javaToJS(value, scope);
            }
        } catch (Exception x) {
            throw new WrappedException(x);
        }
    }

    protected Object lookupParameter(Object[] keys) {
        for (Object key: keys) {
            if (key instanceof String) {
                String s = (String) key;
                if (namedArgs.containsKey(s)) {
                    return namedArgs.get(s);
                }
            } else if (key instanceof Number) {
                int i = ((Number) key).intValue();
                if (i > -1 && i < args.size()) {
                    return args.get(i);
                }
            } else {
                throw new IllegalArgumentException("Wrong argument: " + key);
            }
        }
        return null;
    }

    protected void setName(String str) {
        name = str;
    }

    public String getName() {
        return name;
    }

    protected void addNamedParameter(String key, Object value) {
        namedArgs.put(key, value);
    }

    protected void addParameter(Object value) {
        args.add(value);
    }

    public Object getDefaultValue(Class hint) {
        if (hint == String.class || hint == null) {
            return toString();
        }
        return super.getDefaultValue(hint);
    }

    public String toString() {
        return new StringBuffer("[MacroTag ").append(name).append(" ")
                .append(args).append(namedArgs).append("]").toString();
    }
}
