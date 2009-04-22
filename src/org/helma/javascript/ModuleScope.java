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
import org.helma.repository.Trackable;
import org.mozilla.javascript.*;

/**
 * A scriptable object that keeps track of the resource it has been loaded from
 * so requests to load other stuff can look for local resources.
 */
public class ModuleScope extends NativeObject {

    Trackable source;
    Repository repository;
    String name;
    long checksum;
    Scriptable exports;
    private static final long serialVersionUID = -2409425841990094897L;

    public ModuleScope(String moduleName, Trackable source, Scriptable prototype, Context cx) {
        setParentScope(null);
        setPrototype(prototype);
        this.source = source;
        this.repository = source instanceof Repository ?
                (Repository) source : source.getParentRepository();
        this.name = moduleName;
        this.exports = new ExportsObject();
        defineProperty("exports", exports,  DONTENUM);
        defineProperty("__exports__", cx.newArray(this, 0), DONTENUM);
        defineProperty("__name__", moduleName, DONTENUM);
        defineProperty("__path__", source.getRelativePath(), DONTENUM);
    }

    public Repository getRepository() {
        return repository;
    }

    public void reset(Context cx) {
        this.exports = new ExportsObject();
        defineProperty("exports", exports,  DONTENUM);
        delete("__shared__");     
        defineProperty("__exports__", cx.newArray(this, 0), DONTENUM);
    }

    public long getChecksum() {
        return checksum;
    }

    public void setChecksum(long checksum) {
        this.checksum = checksum;
    }

    public String getModuleName() {
        return name;
    }

    public Scriptable getExports() {
        return exports;
    }

    protected void processExports() {
        // the __exports__ array is an alternative way for a module to export properties.
        // it contains a list of property names that will be copied to the exports object.
        Object e = get("__exports__", this);
        if (e instanceof NativeArray) {
            NativeArray array = (NativeArray) e;
            long length = array.getLength();
            int flags = READONLY | PERMANENT;
            for (int i = 0; i < length; i++) {
                // print("Exporting", moduleName, key, "->", typeof(module[key]));
                Object key = array.get(i, array);
                if (key instanceof String) {
                    Object value = get((String) key, this);
                    ScriptableObject.defineProperty(exports, (String) key, value, flags);
                }
            }
        }

    }

    @Override
    public String toString() {
        return "[ModuleScope " + source + "]";
    }

    @Override
    public Object getDefaultValue(Class hint) {
        if (hint == String.class || hint == null) {
            return toString();
        }
        return super.getDefaultValue(hint);
    }

    class ExportsObject extends NativeObject {
        ExportsObject() {
            setParentScope(ModuleScope.this);
            setPrototype(getObjectPrototype(ModuleScope.this));
        }

        public String getModuleName() {
            return name;
        }
    }
}
