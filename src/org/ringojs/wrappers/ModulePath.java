package org.ringojs.wrappers;

import org.mozilla.javascript.*;
import org.ringojs.repository.Repository;
import org.ringojs.repository.ZipRepository;
import org.ringojs.repository.FileRepository;
import org.ringojs.util.ScriptUtils;
import org.ringojs.util.StringUtils;

import java.io.File;
import java.lang.ref.SoftReference;
import java.util.HashMap;
import java.util.List;
import java.io.IOException;
import java.util.Map;

public class ModulePath extends ScriptableObject {

    List<Repository> paths;
    Map<String, SoftReference<Repository>> cache =
            new HashMap<String, SoftReference<Repository>>();

    public ModulePath(List<Repository> paths, Scriptable scope) {
        this.paths = paths;
        for (Repository repo : paths) {
            cache.put(repo.getPath(), new SoftReference<Repository>(repo));
        }
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
            Repository repo;
            try {
                repo = toRepository(value);
            } catch (IOException iox) {
                throw new WrappedException(iox);
            }
            while (index >= paths.size()) {
                paths.add(null);
            }
            paths.set(index, repo);
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
        Repository repo = null;
        if (value instanceof Repository) {
            repo = (Repository) value;
            // repositories in module search path must be configured as root repository
            repo.setRoot();
            cache.put(repo.getPath(), new SoftReference<Repository>(repo));
        } else if (value != null && value != Undefined.instance) {
            String str = ScriptRuntime.toString(value);
            SoftReference<Repository> ref = cache.get(str);
            repo = ref == null ? null : ref.get();
            if (repo == null) {
                File file = new File(str);
                if (file.isFile() && StringUtils.isZipOrJarFile(str)) {
                    repo = new ZipRepository(str);
                } else {
                    repo = new FileRepository(str);
                }
                cache.put(repo.getPath(), new SoftReference<Repository>(repo));
            }
        } else {
            throw Context.reportRuntimeError("Invalid module path item: " + value);
        }
        return repo;
    }
}
