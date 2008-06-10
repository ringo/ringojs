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

import org.helma.repository.Repository;
import org.helma.repository.Resource;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.NativeObject;
import org.mozilla.javascript.Scriptable;

/**
 * A scriptable object that keeps track of the resource it has been loaded from
 * so requests to load other stuff can look for local resources.
 */
public class ModuleScope extends NativeObject {

    Resource resource;
    Repository repository;
    long checksum;
    private static final long serialVersionUID = -2409425841990094897L;

    public ModuleScope(String moduleName, Resource resource,
                       Repository repository, Scriptable prototype) {
        this.resource = resource;
        this.repository = repository;
        setParentScope(null);
        setPrototype(prototype);
        defineProperty("__name__", moduleName, DONTENUM);
        defineProperty("__path__", repository.getName(), DONTENUM);
    }

    public Repository getRepository() {
        return repository;
    }

    public long getChecksum() {
        return checksum;
    }

    public void setChecksum(long checksum) {
        this.checksum = checksum;
    }

    public String toString() {
        Object path = resource == null ? repository : resource;
        return "[ModuleScope " + path + "]";
    }

    public Object getDefaultValue(Class hint) {
        if (hint == String.class || hint == null) {
            return toString();
        }
        return super.getDefaultValue(hint);
    }

    public Object get(String name, Scriptable start) {
        Object value = super.get(name, start);
        if (value == NOT_FOUND) {
            // Lookup name in per-thread scope. This is how we implement dynamic scopes.
            Context cx = Context.getCurrentContext();
            Scriptable threadScope = (Scriptable) cx.getThreadLocal("threadscope");
            if (threadScope != null) {
                value = threadScope.get(name, threadScope);
            }
        }
        return value;
    }
}
