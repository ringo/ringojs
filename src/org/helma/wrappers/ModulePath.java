package org.helma.wrappers;

import org.mozilla.javascript.*;
import org.helma.repository.Repository;
import org.helma.repository.ZipRepository;
import org.helma.repository.FileRepository;
import org.helma.util.ScriptUtils;

import java.util.List;
import java.io.IOException;

public class ModulePath extends ScriptableObject {

    List<Repository> paths;

    public ModulePath() {
        super();
    }

    public ModulePath(List<Repository> paths, Scriptable scope) {
        this.paths = paths;
        setParentScope(scope);
        setPrototype(ScriptableObject.getClassPrototype(scope, "Array"));
        defineProperty("length", Integer.valueOf(this.paths.size()), DONTENUM);
    }

    @Override
    public String getClassName() {
        return "ModulePath";
    }

    @Override
    public void put(int index, Scriptable start, Object value) {
        if (paths != null) {
            try {
                value = toRepository(value);
            } catch (IOException iox) {
                throw new WrappedException(iox);
            }
            while (index >= paths.size()) {
                paths.add(null);
            }
            paths.set(index, (Repository) value);
            defineProperty("length", Integer.valueOf(paths.size()), DONTENUM);
        } else {
            super.put(index, start, value);
        }
    }

    @Override
    public void put(String id, Scriptable start, Object value) {
        if (paths != null && "length".equals(id)) {
            int length = ScriptUtils.toInt(value, -1);
            if (length < 0) {
                throw Context.reportRuntimeError("Invalid length value: " + value);
            }
            while (length > paths.size()) {
                paths.add(null);
            }
            while (length < paths.size()) {
                paths.remove(length);
            }
        }
        super.put(id, start, value);
    }

    @Override
    public Object get(int index, Scriptable start) {
        if (paths != null) {
            Repository value = index < paths.size() ? paths.get(index) : null;
            return value == null ? NOT_FOUND : value.getPath();
        }
        return super.get(index, start);
    }

    @Override
    public boolean has(int index, Scriptable start) {
        if (paths != null) {
            return index >= 0 && index < paths.size();
        }
        return super.has(index, start);
    }

    @Override
    public Object[] getIds() {
        if (paths != null) {
            Object[] ids = new Object[paths.size()];
            for (int i = 0; i < ids.length; i++) {
                ids[i] = Integer.valueOf(i);
            }
            return ids;
        }
        return super.getIds();
    }

    private Repository toRepository(Object value) throws IOException {
        if (value instanceof Wrapper) {
            value = ((Wrapper) value).unwrap();
        }
        if (value instanceof Repository) {
            return (Repository) value;
        } if (value instanceof String) {
            String str = (String) value;
            if (str.toLowerCase().endsWith(".zip")) {
                return new ZipRepository(str);
            } else {
                return new FileRepository(str);
            }
        } else {
            throw Context.reportRuntimeError("Invalid module path item: " + value);
        }
    }
}
