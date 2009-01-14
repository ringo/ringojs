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

package org.helma.util;

import javax.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Iterator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ParameterMap extends LinkedHashMap {

    static private final Pattern paramPattern = Pattern.compile("\\[(.+?)\\]");

    public ParameterMap() {
        super();
    }

    public ParameterMap(Map map) {
        super((int) (map.size() / 0.75f) + 1);
        for (Iterator i = map.entrySet().iterator(); i.hasNext(); ) {
            Map.Entry e = (Map.Entry) i.next();
            put(e.getKey(), e.getValue());
        }
    }

    @Override
    public Object put(Object key, Object value) {
        // System.err.println("Putting " + key + " -> " + value);
        if (key instanceof String) {
            String name = (String) key;
            int bracket = name.indexOf('[');
            if (bracket > -1 && name.endsWith("]")) {
                Matcher matcher = paramPattern.matcher(name);
                String partName = name.substring(0, bracket);
                return putInternal(partName, matcher, value);
            }
        }
        Object previous = super.get(key);
        if (previous != null && (previous instanceof Map || value instanceof Map))
            throw new RuntimeException("Conflicting HTTP Parameters for '" + key + "'");
        return super.put(key, value);
    }

    private Object putInternal(String name, Matcher matcher, Object value) {
        Object previous = super.get(name);
        if (matcher.find()) {
            ParameterMap map = null;
            if (previous instanceof ParameterMap) {
                map = (ParameterMap) previous;
            } else if (previous == null) {
                map = new ParameterMap();
                super.put(name, map);
            } else {
                throw new RuntimeException("Conflicting HTTP Parameters for '" + name + "'");
            }
            String partName = matcher.group(1);
            return map.putInternal(partName, matcher, value);
        }
        if (previous != null && (previous instanceof Map || value instanceof Map))
            throw new RuntimeException("Conflicting HTTP Parameters for '" + name + "'");
        return super.put(name, value);
    }

    @Override
    public Object get(Object key) {
        if (key instanceof String) {
            String name = (String) key;
            Object value = super.get(key);
            if (name.endsWith("_array") && value == null) {
                value = super.get(name.substring(0, name.length() - 6));
                return value instanceof Object[] ? value : null;
            } else if (name.endsWith("_cookie") && value == null) {
                value = super.get(name.substring(0, name.length() - 7));
                return value instanceof Cookie ? value : null;
            } else if (value instanceof Object[]) {
                Object[] values = ((Object[]) value);
                return values.length > 0 ? values[0] : null;
            } else if (value instanceof Cookie) {
                Cookie cookie = (Cookie) value;
                return cookie.getValue();
            }
        }
        return super.get(key);
    }

    protected Object getRaw(Object key) {
        return super.get(key);
    }


}
