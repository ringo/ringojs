package org.helma.util;

import org.mozilla.javascript.*;

import java.lang.reflect.Method;


public class Storable extends ScriptableObject {

    private Scriptable store;
    private String type;
    private boolean isPrototype;

    private Scriptable properties;
    private Object key;
    private Object entity;

    enum FactoryType {CTOR, KEY, ENTITY};

    static class FactoryFunction extends BaseFunction {

        Storable prototype;
        FactoryType type;

        FactoryFunction(Storable prototype, Scriptable scope, FactoryType type) {
            this.prototype = prototype;
            this.type = type;
            ScriptRuntime.setFunctionProtoAndParent(this, scope);
        }

        /**
         * Performs conversions on argument types if needed and
         * invokes the underlying Java method or constructor.
         * <p/>
         * Implements Function.call.
         *
         * @see org.mozilla.javascript.Function#call(
         *org.mozilla.javascript.Context , org.mozilla.javascript.Scriptable , org.mozilla.javascript.Scriptable , Object[])
         */
        @Override
        public Object call(Context cx, Scriptable scope, Scriptable thisObj, Object[] args) {
            ScriptUtils.checkArguments(args, 0, 1);
            Storable storable = new Storable(prototype.store, prototype.type, false);
            switch (type) {
                case CTOR:
                    Scriptable properties = ScriptUtils.getScriptableArgument(args, 0, true);
                    if (properties == null) {
                        properties = cx.newObject(scope);
                    }
                    storable.properties = properties;
                    break;
                case KEY:
                    storable.key = ScriptUtils.getObjectArgument(args, 0, false);
                    break;
                case ENTITY:
                    storable.entity = ScriptUtils.getObjectArgument(args, 0, false);
                    break;
            }
            storable.setParentScope(scope);
            storable.setPrototype(prototype);
            return storable;
        }
    }

    public Storable() {
        isPrototype = true;
    }

    private Storable(Scriptable store, String type, boolean isPrototype) {
        this.store = store;
        this.type = type;
        this.isPrototype = isPrototype;
    }

    public static Object createStorable(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        ScriptUtils.checkArguments(args, 0, 1);
        Scriptable scope = ctorObj.getParentScope();
        FactoryFunction fun = (FactoryFunction) ctorObj;
        Storable prototype = fun.prototype;
        Storable storable = new Storable(prototype.store, prototype.type, false);
        switch (fun.type) {
            case CTOR:
                Scriptable properties = ScriptUtils.getScriptableArgument(args, 0, true);
                if (properties == null) {
                    properties = cx.newObject(scope);
                }
                storable.properties = properties;
                break;
            case KEY:
                storable.key = ScriptUtils.getObjectArgument(args, 0, false);
                break;
            case ENTITY:
                storable.entity = ScriptUtils.getObjectArgument(args, 0, false);
                break;
        }
        storable.setParentScope(scope);
        storable.setPrototype(prototype);
        return storable;
    }

    public static Scriptable jsStaticFunction_defineStorable(Scriptable store, String type)
            throws NoSuchMethodException {
        int attr = DONTENUM | PERMANENT | READONLY;
        Scriptable scope = ScriptRuntime.getTopCallScope(Context.getCurrentContext());
        Storable prototype = new Storable(store, type, true);
        prototype.setParentScope(scope);
        prototype.setPrototype(ScriptableObject.getClassPrototype(scope, "Storable"));
        BaseFunction func = new FactoryFunction(prototype, scope, FactoryType.CTOR);
        func.setImmunePrototypeProperty(prototype);
        prototype.setParentScope(func);
        defineProperty(prototype, "constructor", func, attr);
        func.defineProperty("fromKey", new FactoryFunction(prototype, scope, FactoryType.KEY), attr);
        func.defineProperty("fromEntity", new FactoryFunction(prototype, scope, FactoryType.ENTITY), attr);
        return func;
    }

    public String getClassName() {
        return "Storable";
    }

    /**
     * Custom <tt>==</tt> operator.
     * Must return {@link org.mozilla.javascript.Scriptable#NOT_FOUND} if this object does not
     * have custom equality operator for the given value,
     * <tt>Boolean.TRUE</tt> if this object is equivalent to <tt>value</tt>,
     * <tt>Boolean.FALSE</tt> if this object is not equivalent to
     * <tt>value</tt>.
     * <p/>
     * The default implementation returns Boolean.TRUE
     * if <tt>this == value</tt> or {@link org.mozilla.javascript.Scriptable#NOT_FOUND} otherwise.
     * It indicates that by default custom equality is available only if
     * <tt>value</tt> is <tt>this</tt> in which case true is returned.
     */
    @Override
    protected Object equivalentValues(Object value) {
        if (value instanceof Storable) {
            return this == value;
        }
        return NOT_FOUND;
    }

    public void jsFunction_save() {
        System.err.println("SAVING");
    }

    public void jsFunction_remove() {
        System.err.println("REMOVING");
    }

    public String jsGet__key() {
        return "KEY";
    }

    public String jsGet__id() {
        return "ID";
    }

    @Override
    public boolean has(String name, Scriptable start) {
        if (isPrototype) {
            return super.has(name, start);
        }
        if (properties != null && properties.has(name, properties)) {
            return true;
        }
        Object[] args = {key, entity, name};
        Object value = invokeStoreMethod("hasProperty", args);
        return value == NOT_FOUND ? false : ScriptRuntime.toBoolean(value);
    }

    @Override
    public Object get(String name, Scriptable start) {
        if (isPrototype) {
            return super.get(name, this);
        }
        if (properties != null && properties.has(name, properties)) {
            return properties.get(name, properties);
        }
        Object[] args = {key, entity, name};
        Object value = invokeStoreMethod("getProperty", args);
        super.put(name, this, value);
        return value;
    }

    @Override
    public void put(String name, Scriptable start, Object value) {
        if (isPrototype) {
            super.put(name, start, value);
        } else {
            if (properties == null) {
                properties = loadProperties();
            }
            properties.put(name, properties, value);
        }
    }

    @Override
    public void delete(String name) {
        if (isPrototype) {
            super.delete(name);
        } else {
            if (properties == null) {
                properties = loadProperties();
            }
            properties.put(name, properties, null);
        }
    }

    public Object[] getIds() {
        if (isPrototype) {
            return super.getIds();
        }
        if (properties == null) {
            properties = loadProperties();
        }
        return properties.getIds();
    }

    private Scriptable loadProperties() {
        Object[] args = new Object[] {key};
        if (entity == null) {
            entity = args[0] = invokeStoreMethod("loadEntity", args);
        }
        Object props = invokeStoreMethod("getProperties", args);
        if (props == NOT_FOUND) {
            return Context.getCurrentContext().newObject(getParentScope());
        }
        return (Scriptable) props;
    }

    private Object invokeStoreMethod(String method, Object[] args) {
        Object value = ScriptableObject.getProperty(store, method);
        if (value instanceof Callable) {
            return ((Callable) value).call(Context.getCurrentContext(), getParentScope(), store, args);
        }
        return NOT_FOUND;
    }

}
