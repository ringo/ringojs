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

package org.ringojs.engine;

import org.ringojs.repository.Repository;
import org.ringojs.repository.Trackable;
import org.mozilla.javascript.*;

/**
 * A scriptable object that keeps track of the resource it has been loaded from
 * so requests to load other stuff can look for local resources.
 */
public class ModuleScope extends ImporterTopLevel {

    private Trackable source;
    private Repository repository;
    private String name;
    private long checksum;
    private Scriptable exportsObject, metaObject;
    private static final long serialVersionUID = -2409425841990094897L;

    public ModuleScope(String moduleName, Trackable source, Scriptable prototype, Context cx) {
        setParentScope(null);
        setPrototype(prototype);
        // for activating the ImporterTopLevel import* functions
        activatePrototypeMap(3);
        this.source = source;
        this.repository = source instanceof Repository ?
                (Repository) source : source.getParentRepository();
        this.name = moduleName;
        // create and define exports object
        this.exportsObject = new ExportsObject();
        defineProperty("exports", exportsObject,  DONTENUM);
        // create and define module meta-object
        metaObject = new ModuleMetaObject(this);
        defineProperty("module", metaObject, DONTENUM);
    }

    public Trackable getSource() {
        return source;
    }

    public Repository getRepository() {
        return repository;
    }

    public void reset() {
        this.exportsObject = new ExportsObject();
        defineProperty("exports", exportsObject,  DONTENUM);
        metaObject.delete("shared");
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
        exportsObject = (Scriptable) get("exports", this);
        return exportsObject;
    }

    public Scriptable getMetaObject() {
        return metaObject;
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
