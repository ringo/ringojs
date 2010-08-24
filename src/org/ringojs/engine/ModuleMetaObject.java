package org.ringojs.engine;

import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;
import org.mozilla.javascript.annotations.JSFunction;
import org.mozilla.javascript.annotations.JSGetter;
import org.ringojs.repository.Repository;
import org.ringojs.repository.Trackable;

public class ModuleMetaObject extends ScriptableObject {

    String id;
    Trackable source;
    Repository repository;

    public ModuleMetaObject() {}

    ModuleMetaObject(ModuleScope moduleScope) {
        setParentScope(moduleScope);
        setPrototype(ScriptableObject.getClassPrototype(moduleScope, "ModuleMetaObject"));
        this.id = moduleScope.getModuleName();
        this.source = moduleScope.getSource();
        this.repository = moduleScope.getRepository();
    }

    @JSFunction
    public String resolve(String path) {
        return repository == null ? path : repository.getRelativePath() + path;
    }

    @JSGetter
    public Object getId() {
        return id == null ? Undefined.instance : id;
    }

    @JSGetter
    public Object getPath() {
        return source == null ? Undefined.instance : source.getPath();
    }

    @JSGetter
    public Object getUri() {
        try {
            return source == null ? Undefined.instance : source.getUrl().toString();
        } catch (Exception x) {
            return Undefined.instance;
        }
    }

    @JSGetter
    public Object getDirectory() {
        return repository == null ? Undefined.instance : repository.getPath();
    }

    @Override
    protected Object equivalentValues(Object value) {
        if (value instanceof String) {
            return value.equals(id) ? Boolean.TRUE : Boolean.FALSE;
        }
        return NOT_FOUND;
    }

    @Override
    public String getClassName() {
        return "ModuleMetaObject";
    }
}
