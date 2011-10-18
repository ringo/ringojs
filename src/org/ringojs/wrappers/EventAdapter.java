package org.ringojs.wrappers;

import org.mozilla.classfile.ByteCode;
import org.mozilla.classfile.ClassFileWriter;
import org.mozilla.javascript.ClassCache;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.GeneratedClassLoader;
import org.mozilla.javascript.NativeJavaClass;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.SecurityController;
import org.mozilla.javascript.SecurityUtilities;
import org.mozilla.javascript.annotations.JSConstructor;
import org.mozilla.javascript.annotations.JSFunction;
import org.ringojs.engine.RhinoEngine;
import org.ringojs.engine.RingoWorker;

import static org.mozilla.classfile.ClassFileWriter.ACC_PUBLIC;

import java.lang.reflect.Method;
import java.security.CodeSource;
import java.security.ProtectionDomain;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class EventAdapter extends ScriptableObject {

    private Map<String,List<Callback>> callbacks = new HashMap<String,List<Callback>>();

    @Override
    public String getClassName() {
        return "EventAdapter";
    }

    public EventAdapter() {}

    @JSConstructor
    @SuppressWarnings("unchecked")
    public static Object jsConstructor(Context cx, Object[] args,
                                       Function functionObj, boolean inNewExpr) {
        List<Class<?>> interfaces = new ArrayList<Class<?>>();
        Map<String, String> mapping = null;
        int length = args.length;
        for (int i = 0; i < length; i++) {
            Object arg = args[i];
            if (!(arg instanceof NativeJavaClass)) {
                if (i < length - 1) {
                    throw ScriptRuntime.typeError2("msg.not.java.class.arg",
                            String.valueOf(i),
                            ScriptRuntime.toString(arg));
                }
                if (!(arg instanceof Map)) {
                    throw ScriptRuntime.typeError1("msg.arg.not.obj",
                            ScriptRuntime.typeof(arg));
                }
                mapping = new HashMap<String, String>((Map)arg);
            } else {
                Class<?> c = ((NativeJavaClass) arg).getClassObject();
                if (!c.isInterface()) {
                    throw ScriptRuntime.typeError("EventAdapter argument must be interface");
                }
                interfaces.add(c);
            }
        }
        try {
            Scriptable scope = ScriptableObject.getTopLevelScope(functionObj);
            ClassCache cache = ClassCache.get(scope);
            String className = "EventAdapter" + cache.newClassSerialNumber();
            byte[] code = getAdapterClass(className, interfaces, mapping);
            Class<?> adapterClass = loadAdapterClass(className, code);
            return adapterClass.getConstructor().newInstance();
        } catch (Exception ex) {
            throw Context.throwAsScriptRuntimeEx(ex);
        }
    }

    @JSFunction
    public void addListener(String type, Object function) {
        addListener(type, false, function);
    }

    @JSFunction
    public void addSyncListener(String type, Object function) {
        addListener(type, true, function);
    }

    private void addListener(String type, boolean sync, Object function) {
        if (!(function instanceof Function)) {
            Context.reportError("Event listener must be a function");
        }
        List<Callback> list = callbacks.get(type);
        if (list == null) {
            list = new ArrayList<Callback>();
            callbacks.put(type, list);
        }
        Callback callback = new Callback();
        Scriptable scope = ScriptableObject.getTopLevelScope((Scriptable)function);
        callback.module = scope;
        callback.function = function;
        callback.worker = RhinoEngine.getEngine(scope.getPrototype()).getCurrentWorker();
        callback.sync = sync;
        list.add(callback);
    }

    @JSFunction
    public Object removeListener(String type, Object callback) {
        List<Callback> list = callbacks.get(type);
        if (list != null) {
            list.remove(callback);
        }
        return this;
    }

    @JSFunction
    public Object removeAllListeners(String type) {
        callbacks.remove(type);
        return this;
    }

    @JSFunction
    public static void emit(Context cx, Scriptable thisObj,
                            Object[] args, Function funObj) {
        if (!(thisObj instanceof EventAdapter)) {
            throw ScriptRuntime.typeError(
                    "emit() called on incompatible object: "
                            + ScriptRuntime.toString(thisObj));
        }
        String type = (String) args[0];
        int length = args.length - 1;
        Object[] fargs = new Object[length];
        System.arraycopy(args, 1, fargs, 0, length);
        ((EventAdapter)thisObj).emit(type, fargs);
    }

    public void emit(String type, Object... args) {
        List<Callback> list = callbacks.get(type);
        if (list != null) {
            for (Callback callback : list) {
                callback.invoke(args);
            }
        }
    }

    private static byte[] getAdapterClass(String className,
                                           List<Class<?>> interfaces,
                                           Map<String, String> mapping) {
        String superName = EventAdapter.class.getName();
        ClassFileWriter cfw = new ClassFileWriter(className,
                                                  superName,
                                                  "<EventAdapter>");
        Set<Method> methods = new HashSet<Method>();
        for (Class<?> interf : interfaces) {
            cfw.addInterface(interf.getName());
            Method[] ifmethods = interf.getMethods();
            Collections.addAll(methods, ifmethods);
        }

        cfw.startMethod("<init>", "()V", ACC_PUBLIC);
        // Invoke base class constructor
        cfw.add(ByteCode.ALOAD_0);  // this
        cfw.addInvoke(ByteCode.INVOKESPECIAL, superName, "<init>", "()V");
        cfw.add(ByteCode.RETURN);
        cfw.stopMethod((short)1); // this

        for (Method method : methods) {
            Class<?>[]paramTypes = method.getParameterTypes();
            int paramLength = paramTypes.length;
            Class<?>returnType = method.getReturnType();
            cfw.startMethod(method.getName(), getSignature(paramTypes, returnType), ACC_PUBLIC);
            cfw.addLoadThis();
            cfw.addLoadConstant(method.getName()); // event type
            cfw.addLoadConstant(paramLength);  // create args array
            cfw.add(ByteCode.ANEWARRAY, "java/lang/Object");
            for (int i = 0; i < paramLength; i++) {
                cfw.add(ByteCode.DUP);
                cfw.addLoadConstant(i);
                Class<?> param = paramTypes[i];
                if (param.isPrimitive()) {
                    throw new RuntimeException("primitive event parameters are not supported yet");
                }
                cfw.addALoad(i + 1);
                cfw.add(ByteCode.AASTORE);
            }
            cfw.addInvoke(ByteCode.INVOKEVIRTUAL, className, "emit",
                    "(Ljava/lang/String;[Ljava/lang/Object;)V");
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
            cfw.stopMethod((short)(paramLength + 1));
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

    class Callback {
        RingoWorker worker;
        Object module;
        Object function;
        boolean sync;

        void invoke(Object[] args) {
            if (sync) {
                try {
                    worker.invoke(module, function, args);
                } catch (Exception x) {
                    throw new RuntimeException(x);
                }
            } else {
                worker.submit(module, function, args);
            }
        }
    }

}


