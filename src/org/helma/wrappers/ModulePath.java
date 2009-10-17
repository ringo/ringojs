package org.helma.wrappers;

import org.mozilla.javascript.*;
import org.helma.repository.Repository;
import org.helma.repository.ZipRepository;
import org.helma.repository.FileRepository;
import org.helma.util.ScriptUtils;

import java.lang.reflect.Constructor;
import java.util.List;
import java.io.IOException;

public class ModulePath extends ScriptableObject {

    List<Repository> list;

    public ModulePath() {
        super();
    }

    public ModulePath(Object arg) {
        if (arg instanceof Wrapper) {
            arg = ((Wrapper) arg).unwrap();
        }
        if (!(arg instanceof List)) {
            throw Context.reportRuntimeError("Invalid argument to ModulePath: " + arg);
        }
        this.list = (List) arg;
        defineProperty("length", Integer.valueOf(this.list.size()), DONTENUM);
    }

    public static void init(Scriptable scope) throws NoSuchMethodException {
        ModulePath proto = new ModulePath();
        proto.setPrototype(ScriptableObject.getClassPrototype(scope, "Array"));
        proto.setParentScope(getTopLevelScope(scope));
        Constructor<? extends ModulePath> cnst = ModulePath.class.getConstructor(Object.class);
        FunctionObject jsCnst = new FunctionObject("ModulePath", cnst, scope);
        jsCnst.addAsConstructor(scope, proto);
    }

    @Override
    public String getClassName() {
        return "ModulePath";
    }

    @Override
    public void put(int index, Scriptable start, Object value) {
        if (list != null) {
            try {
                value = toRepository(value);
            } catch (IOException iox) {
                throw new WrappedException(iox);
            }
            while (index >= list.size()) {
                list.add(null);
            }
            list.set(index, (Repository) value);
            defineProperty("length", Integer.valueOf(list.size()), DONTENUM);
        } else {
            super.put(index, start, value);
        }
    }

    @Override
    public void put(String id, Scriptable start, Object value) {
        if (list != null && "length".equals(id)) {
            int length = ScriptUtils.toInt(value, -1);
            if (length < 0) {
                throw Context.reportRuntimeError("Invalid length value: " + value);
            }
            while (length > list.size()) {
                list.add(null);
            }
            while (length < list.size()) {
                list.remove(length);
            }
        }
        super.put(id, start, value);
    }

    @Override
    public Object get(int index, Scriptable start) {
        if (list != null) {
            Repository value = index < list.size() ? list.get(index) : null;
            return value == null ? NOT_FOUND : value.getPath();
        }
        return super.get(index, start);
    }

    @Override
    public boolean has(int index, Scriptable start) {
        if (list != null) {
            return index >= 0 && index < list.size();
        }
        return super.has(index, start);
    }

    @Override
    public Object[] getIds() {
        if (list != null) {
            Object[] ids = new Object[list.size()];
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
