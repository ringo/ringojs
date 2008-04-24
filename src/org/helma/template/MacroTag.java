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

import org.helma.util.CaseInsensitiveMap;
import org.helma.util.ScriptableList;
import org.helma.util.ScriptableMap;
import org.mozilla.javascript.*;

import java.util.ArrayList;
import java.util.Map;
import java.util.List;

/**
 * A macro tag. Basically a list of unnamed parameters
 * and a map of named parameters.
 */
public class MacroTag extends ScriptableObject {

    Object name;
    ArrayList<Object> args = new ArrayList<Object>();
    Map<String,Object> namedArgs = new CaseInsensitiveMap<String,Object>();
    int startLine;

    static final Object[] ownIds = new Object[] {"name", "parameters", "parameterNames"};

    Object jsParams, jsNames;

    public MacroTag() {}

    public MacroTag(int line) {
        this.startLine = line;
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

    public int jsGet_startLine() {
        return startLine;
    }

    public Object jsGet_name() {
        return name instanceof String ?
                name : null;
    }

    public Object jsGet_parameterNames() {
        if (jsNames == null) {
            Context cx = Context.getCurrentContext();
            int size = namedArgs.size();
            Object[] values = namedArgs.keySet().toArray(new Object[size]);
            jsNames = cx.newArray(getTopLevelScope(this), values);
        }
        return jsNames;
    }

    public Object jsGet_parameters() {
        if (jsParams == null) {
            Context cx = Context.getCurrentContext();
            int size = args.size();
            Object[] values = args.toArray(new Object[size]);
            jsParams = cx.newArray(getTopLevelScope(this), values);
        }
        return jsParams;
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

    protected void addNamed(String key, Object value) {
        if (name == null) {
            name = value;
        } else {
            namedArgs.put(key, value);
        }
    }

    protected void add(Object value) {
        if (name == null) {
            name = value;
        } else {
            args.add(value);
        }
    }

    public String toString() {
        return new StringBuffer("[MacroTag ")
                .append(args).append(namedArgs).append("]").toString();
    }
}
