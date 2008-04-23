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

import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

/**
 * A macro tag. Basically a list of unnamed parameters
 * and a map of named parameters.
 */
public class MacroTag {

    ArrayList<Object> args = new ArrayList<Object>();
    Map<String,Object> namedArgs = new CaseInsensitiveMap<String,Object>();
    int startLine;

    public MacroTag(int line) {
        this.startLine = line;
    }

    public List<Object> getArgs() {
        return args;
    }

    public Map<String,Object> getNamedArgs() {
        return namedArgs;
    }

    public int getStartLine() {
        return startLine;
    }

    public String getName() {
        if (args.size() == 0)
            return null;
        Object first = args.get(0);
        return first instanceof String ? (String) first : null;
    }


    public Object getParameter(String name) {
        if (name != null && namedArgs.containsKey(name)) {
            return namedArgs.get(name);
        }
        return null;
    }

    public Object getParameter(int position) {
        if (position > -1 && position < args.size()) {
            return args.get(position);
        }
        return null;
    }

    public Object getParameter(String name, int position) {
        if (name != null && namedArgs.containsKey(name)) {
            return namedArgs.get(name);
        }
        if (position > -1 && position < args.size()) {
            return args.get(position);
        }
        return null;
    }

    public int getLength() {
        return args.size();
    }

    public String[] getNames() {
        int size = namedArgs.size();
        return namedArgs.keySet().toArray(new String[size]);
    }

    public String toString() {
        return new StringBuffer("[MacroTag ")
                .append(args).append(namedArgs).append("]").toString();
    }
}
