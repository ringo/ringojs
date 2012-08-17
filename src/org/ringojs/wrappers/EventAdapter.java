package org.ringojs.wrappers;

import org.mozilla.classfile.ByteCode;
import org.mozilla.classfile.ClassFileWriter;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.GeneratedClassLoader;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.SecurityController;
import org.mozilla.javascript.SecurityUtilities;
import org.mozilla.javascript.annotations.JSConstructor;
import org.mozilla.javascript.annotations.JSFunction;
import org.mozilla.javascript.annotations.JSGetter;
import org.ringojs.engine.Callback;
import org.ringojs.engine.RhinoEngine;
import org.mozilla.javascript.Undefined;

import static org.mozilla.classfile.ClassFileWriter.ACC_FINAL;
import static org.mozilla.classfile.ClassFileWriter.ACC_PRIVATE;
import static org.mozilla.classfile.ClassFileWriter.ACC_PUBLIC;

import java.lang.ref.WeakReference;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.security.CodeSource;
import java.security.ProtectionDomain;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class EventAdapter extends ScriptableObject {

    private RhinoEngine engine;
    private Map<String,List<Callback>> callbacks = new HashMap<String,List<Callback>>();
    private Object impl;

    static Map<AdapterKey, WeakReference<Class<?>>> adapterCache =
            new HashMap<AdapterKey, WeakReference<Class<?>>>();
    static AtomicInteger serial = new AtomicInteger();

    @Override
    public String getClassName() {
        return "EventAdapter";
    }

    public EventAdapter() {
        this.engine = null;
    }

    public EventAdapter(RhinoEngine engine) {
        this.engine = engine;
    }

    @JSConstructor
    public static Object jsConstructor(Context cx, Object[] args,
                                       Function function, boolean inNewExpr) {
        if (args.length == 0) {
            throw ScriptRuntime.typeError("EventAdapter requires at least one argument");
        }
        // First argument must be an array of java classes
        if (!(args[0] instanceof List)) {
            throw ScriptRuntime.typeError("First argument must be an Array or List");
        }
        Object[] classes = ((List)args[0]).toArray();
        for (Object aClass : classes) {
            if (!(aClass instanceof Class)) {
                throw ScriptRuntime.typeError("Not a Java class: " +
                        ScriptRuntime.toString(aClass));
            }
        }
        // Second argument can be a map of method names to event names
        Map overrides = args.length > 1 && args[1] instanceof Map ?
                (Map)args[1] : null;
        try {
            Class<?> adapterClass = getAdapterClass(classes, overrides);
            Scriptable scope = getTopLevelScope(function);
            RhinoEngine engine = RhinoEngine.getEngine(scope);
            Constructor cnst = adapterClass.getConstructor(EventAdapter.class);
            EventAdapter adapter = new EventAdapter(engine);
            adapter.impl = cnst.newInstance(adapter);
            return adapter;
        } catch (Exception ex) {
            throw Context.throwAsScriptRuntimeEx(ex);
        }
    }

    @JSGetter
    public Object getImpl() {
        return impl;
    }

    @JSFunction
    public Object addListener(String type, Object function) {
        addListener(type, false, function);
        return this;
    }

    @JSFunction
    public Object addSyncListener(String type, Object function) {
        addListener(type, true, function);
        return this;
    }

    private void addListener(String type, boolean sync, Object function) {
        if (!(function instanceof Scriptable)) {
            Context.reportError("Event listener must be an object or function");
        }
        List<Callback> list = callbacks.get(type);
        if (list == null) {
            list = new LinkedList<Callback>();
            callbacks.put(type, list);
        }
        list.add(new Callback((Scriptable)function, engine, sync));
    }

    @JSFunction
    public Object removeListener(String type, Object callback) {
        List<Callback> list = callbacks.get(type);
        if (list != null && callback instanceof Scriptable) {
            Scriptable s = (Scriptable) callback;
            for (Iterator<Callback> it = list.iterator(); it.hasNext();) {
                if (it.next().equalsCallback(s)) {
                    it.remove();
                    break;
                }
            }
        }
        return this;
    }

    @JSFunction
    public Object removeAllListeners(String type) {
        callbacks.remove(type);
        return this;
    }

    @JSFunction
    public static boolean emit(Context cx, Scriptable thisObj,
                               Object[] args, Function funObj) {
        if (!(thisObj instanceof EventAdapter)) {
            throw ScriptRuntime.typeError(
                    "emit() called on incompatible object: " + ScriptRuntime.toString(thisObj));
        }
        if (args.length == 0 || args[0] == null || args[0] == Undefined.instance) {
            throw ScriptRuntime.typeError(
                    "emit() requires event type as first argument");
        }
        String type = ScriptRuntime.toString(args[0]);
        int length = args.length - 1;
        Object[] fargs = new Object[length];
        System.arraycopy(args, 1, fargs, 0, length);
        EventAdapter self = (EventAdapter)thisObj;
        return self.emit(type, fargs);
    }

    public boolean emit(String type, Object... args) {
        List<Callback> list = callbacks.get(type);
        if (list != null) {
            for (Callback callback : list) {
                callback.invoke(args);
            }
            return !list.isEmpty();
        }
        return false;
    }

    public static Class<?> getAdapterClass(Object[] classes, Map<?,?> overrides) {
        AdapterKey key = new AdapterKey(classes, overrides);
        WeakReference<Class<?>> cachedClass = adapterCache.get(key);
        Class<?> adapterClass = cachedClass == null ? null : cachedClass.get();
        if (adapterClass == null) {
            String className = "org.ringojs.adapter.EventAdapter" +
                    serial.incrementAndGet();
            byte[] code = getAdapterClass(className, classes, overrides);
            adapterClass = loadAdapterClass(className, code);
            adapterCache.put(key, new WeakReference<Class<?>>(adapterClass));
        }
        return adapterClass;
    }

    private static byte[] getAdapterClass(String className, Object[] classes,
                                          Map<?,?> overrides) {
        Set<Method> methods = new HashSet<Method>();
        Class<?> clazz = (Class<?>)classes[0];
        boolean isInterface = clazz.isInterface();
        String superName = isInterface ? Object.class.getName() : clazz.getName();
        String adapterSignature = classToSignature(EventAdapter.class);
        ClassFileWriter cfw = new ClassFileWriter(className, superName,
                                                  "<EventAdapter>");
        for (Object c : classes) {
            clazz = (Class<?>)c;
            if (clazz.isInterface()) {
                cfw.addInterface(clazz.getName());
            }
            Collections.addAll(methods, clazz.getMethods());
        }

        cfw.addField("events", adapterSignature, (short) (ACC_PRIVATE | ACC_FINAL));

        cfw.startMethod("<init>", "(" + adapterSignature + ")V", ACC_PUBLIC);
        // Invoke base class constructor
        cfw.addLoadThis();
        cfw.addInvoke(ByteCode.INVOKESPECIAL, superName, "<init>", "()V");
        cfw.addLoadThis();
        cfw.add(ByteCode.ALOAD_1);  // event adapter
        cfw.add(ByteCode.PUTFIELD, cfw.getClassName(), "events", adapterSignature);
        cfw.add(ByteCode.RETURN);
        cfw.stopMethod((short)2);

        for (Method method : methods) {
            String methodName = method.getName();
            String eventName = overrides == null
                    ? toEventName(methodName)
                    : toStringOrNull(overrides.get(methodName));
            int mod = method.getModifiers();
            if (!Modifier.isAbstract(mod) && (eventName == null || Modifier.isFinal(mod))) {
                continue;
            }
            Class<?>[]paramTypes = method.getParameterTypes();
            int paramLength = paramTypes.length;
            int localsLength = paramLength + 1;
            for (Class<?> c : paramTypes) {
                // adjust locals length for long and double parameters
                if (c == Double.TYPE || c == Long.TYPE) ++localsLength;
            }
            Class<?>returnType = method.getReturnType();
            cfw.startMethod(methodName, getSignature(paramTypes, returnType), ACC_PUBLIC);
            cfw.addLoadThis();
            cfw.add(ByteCode.GETFIELD, cfw.getClassName(), "events", adapterSignature);
            cfw.addLoadConstant(eventName); // event type
            cfw.addLoadConstant(paramLength);  // create args array
            cfw.add(ByteCode.ANEWARRAY, "java/lang/Object");
            for (int i = 0; i < paramLength; i++) {
                cfw.add(ByteCode.DUP);
                cfw.addLoadConstant(i);
                Class<?> param = paramTypes[i];
                if (param == Integer.TYPE || param == Byte.TYPE
                        || param == Character.TYPE || param == Short.TYPE) {
                    cfw.addILoad(i + 1);
                    cfw.addInvoke(ByteCode.INVOKESTATIC, "java/lang/Integer",
                            "valueOf", "(I)Ljava/lang/Integer;");
                } else if (param == Boolean.TYPE) {
                    cfw.addILoad(i + 1);
                    cfw.addInvoke(ByteCode.INVOKESTATIC, "java/lang/Boolean",
                            "valueOf", "(Z)Ljava/lang/Boolean;");
                } else if (param == Double.TYPE) {
                    cfw.addDLoad(i + 1);
                    cfw.addInvoke(ByteCode.INVOKESTATIC, "java/lang/Double",
                            "valueOf", "(I)Ljava/lang/Double;");
                } else if (param == Float.TYPE) {
                    cfw.addFLoad(i + 1);
                    cfw.addInvoke(ByteCode.INVOKESTATIC, "java/lang/Float",
                            "valueOf", "(I)Ljava/lang/Float;");
                } else if (param == Long.TYPE) {
                    cfw.addLLoad(i + 1);
                    cfw.addInvoke(ByteCode.INVOKESTATIC, "java/lang/Long",
                            "valueOf", "(I)Ljava/lang/Long;");
                } else {
                    cfw.addALoad(i + 1);
                }
                cfw.add(ByteCode.AASTORE);
            }
            cfw.addInvoke(ByteCode.INVOKEVIRTUAL, EventAdapter.class.getName(),
                    "emit", "(Ljava/lang/String;[Ljava/lang/Object;)Z");
            cfw.add(ByteCode.POP); // always discard result of emit()
            if (returnType == Void.TYPE) {
                cfw.add(ByteCode.RETURN);
            } else if (returnType == Integer.TYPE || returnType == Byte.TYPE
                    || returnType == Character.TYPE || returnType == Short.TYPE) {
                cfw.add(ByteCode.ICONST_0);
                cfw.add(ByteCode.IRETURN);
            } else if (returnType == Boolean.TYPE) {
                cfw.add(ByteCode.ICONST_1); // return true for boolean
                cfw.add(ByteCode.IRETURN);
            } else if (returnType == Double.TYPE) {
                cfw.add(ByteCode.DCONST_0);
                cfw.add(ByteCode.DRETURN);
            } else if (returnType == Float.TYPE) {
                cfw.add(ByteCode.FCONST_0);
                cfw.add(ByteCode.FRETURN);
            } else if (returnType == Long.TYPE) {
                cfw.add(ByteCode.LCONST_0);
                cfw.add(ByteCode.LRETURN);
            } else {
                cfw.add(ByteCode.ACONST_NULL);
                cfw.add(ByteCode.ARETURN);
            }
            cfw.stopMethod((short)(localsLength));
        }

        return cfw.toByteArray();
    }

    private static Class<?> loadAdapterClass(String className, byte[] classBytes) {
        Object staticDomain;
        Class<?> domainClass = SecurityController.getStaticSecurityDomainClass();
        if(domainClass == CodeSource.class || domainClass == ProtectionDomain.class) {
            // use the calling script's security domain if available
            ProtectionDomain protectionDomain = SecurityUtilities.getScriptProtectionDomain();
            if (protectionDomain == null) {
                protectionDomain = EventAdapter.class.getProtectionDomain();
            }
            if(domainClass == CodeSource.class) {
                staticDomain = protectionDomain == null ? null : protectionDomain.getCodeSource();
            }
            else {
                staticDomain = protectionDomain;
            }
        }
        else {
            staticDomain = null;
        }
        GeneratedClassLoader loader = SecurityController.createLoader(null,
                staticDomain);
        Class<?> result = loader.defineClass(className, classBytes);
        loader.linkClass(result);
        return result;
    }

    private static String toStringOrNull(Object name) {
        return name == null ? null : name.toString();
    }

    public static String toEventName(Object name) {
        String methodName = ScriptRuntime.toString(name);
        int length = methodName.length();
        if (length > 2 && methodName.regionMatches(0, "on", 0, 2)
                && Character.isUpperCase(methodName.charAt(2))) {
            char[] chars = new char[length - 2];
            methodName.getChars(2, length, chars, 0);
            chars[0] = Character.toLowerCase(chars[0]);
            return new String(chars);
        }
        return methodName;
    }

    public static String getSignature(Class<?>[] paramTypes, Class<?> returnType) {
        StringBuilder b = new StringBuilder("(");
        for (Class<?> param : paramTypes) {
            b.append(classToSignature(param));
        }
        b.append(")");
        b.append(classToSignature(returnType));
        return b.toString();
    }

    /**
     * Convert Java class to "Lname-with-dots-replaced-by-slashes;" form
     * suitable for use as JVM type signatures. This includes support
     * for arrays and primitive types such as int or boolean.
     * @param clazz the class
     * @return the signature
     */
    public static String classToSignature(Class<?> clazz) {
        if (clazz.isArray()) {
            // arrays return their signature as name, e.g. "[B" for byte arrays
            return "[" + classToSignature(clazz.getComponentType());
        } else if (clazz.isPrimitive()) {
            if (clazz == java.lang.Integer.TYPE) return "I";
            if (clazz == java.lang.Long.TYPE) return "J";
            if (clazz == java.lang.Short.TYPE) return "S";
            if (clazz == java.lang.Byte.TYPE) return "B";
            if (clazz == java.lang.Boolean.TYPE) return "Z";
            if (clazz == java.lang.Character.TYPE) return "C";
            if (clazz == java.lang.Double.TYPE) return "D";
            if (clazz == java.lang.Float.TYPE) return "F";
            if (clazz == java.lang.Void.TYPE) return "V";
        }
        return ClassFileWriter.classNameToSignature(clazz.getName());
    }

    static class AdapterKey {

        final private Object[] classes;
        final private Map overrides;

        AdapterKey(Object[] classes, Map overrides) {
            assert classes != null;
            this.classes = classes;
            this.overrides = overrides;
        }

        @Override
        @SuppressWarnings("unchecked")
        public boolean equals(Object obj) {
            if (this == obj) {
                return true;
            }
            if (!(obj instanceof AdapterKey)) {
                return false;
            }
            AdapterKey key = (AdapterKey)obj;
            if (!Arrays.equals(classes, key.classes)) {
                return false;
            }
            // NativeObject's equals() method doesn't follow semantics of
            // Map.equals() so we need to compare each entry
            if (overrides != null) {
                if (key.overrides == null ||
                        overrides.size() != key.overrides.size()) {
                    return false;
                }
                Iterator<Map.Entry> e1 = overrides.entrySet().iterator();
                Iterator<Map.Entry> e2 = key.overrides.entrySet().iterator();
                while(e1.hasNext()) {
                    if (!e1.next().equals(e2.next())) {
                        return false;
                    }
                }
            } else if (key.overrides != null) {
                return false;
            }
            return true;
        }

        @Override
        @SuppressWarnings("unchecked")
        public int hashCode() {
            int h = Arrays.hashCode(classes);
            if (overrides != null) {
                Set<Map.Entry<?,?>> entries = overrides.entrySet();
                int j = 0;
                for (Map.Entry e : entries) {
                    j += e.hashCode();
                }
                h = 31 * h + j;
            }
            return h;
        }

        @Override
        public String toString() {
            return "AdapterKey[" + Arrays.toString(classes) + "]";
        }
    }

}


