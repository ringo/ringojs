package org.ringojs.wrappers;

import org.mozilla.classfile.ByteCode;
import org.mozilla.classfile.ClassFileWriter;
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
import org.mozilla.javascript.Undefined;

import static org.mozilla.classfile.ClassFileWriter.ACC_PUBLIC;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.security.CodeSource;
import java.security.ProtectionDomain;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

public class EventAdapter extends ScriptableObject {

    private RhinoEngine engine;
    private Map<String,List<Callback>> callbacks = new HashMap<String,List<Callback>>();
    static Map<Class<?>,Class<?>> adapterCache = new HashMap<Class<?>, Class<?>>();
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
    @SuppressWarnings("unchecked")
    public static Object jsConstructor(Context cx, Object[] args,
                                       Function function, boolean inNewExpr) {
        int length = args.length;
        if (length != 1 || !(args[0] instanceof NativeJavaClass)) {
            throw ScriptRuntime.typeError2("msg.not.java.class.arg",
                    String.valueOf(1),
                    length == 0 ? "undefined" : ScriptRuntime.toString(args[0]));
        }
        Class<?> interf = ((NativeJavaClass) args[0]).getClassObject();
        if (!interf.isInterface()) {
            throw ScriptRuntime.typeError("EventAdapter argument must be interface");
        }
        try {
            Class<?> adapterClass = adapterCache.get(interf);
            if (adapterClass == null) {
                String className = "EventAdapter" + serial.incrementAndGet();
                byte[] code = getAdapterClass(className, interf);
                adapterClass = loadAdapterClass(className, code);
            }
            Scriptable scope = getTopLevelScope(function);
            RhinoEngine engine = RhinoEngine.getEngine(scope);
            Constructor cnst = adapterClass.getConstructor(RhinoEngine.class);
            return cnst.newInstance(engine);
        } catch (Exception ex) {
            throw Context.throwAsScriptRuntimeEx(ex);
        }
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
        Callback callback = new Callback((Scriptable)function, sync);
        list.add(callback);
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

    private static byte[] getAdapterClass(String className,
                                          Class<?> interf) {
        String superName = EventAdapter.class.getName();
        ClassFileWriter cfw = new ClassFileWriter(className,
                                                  superName,
                                                  "<EventAdapter>");
        cfw.addInterface(interf.getName());
        Method[] methods = interf.getMethods();

        cfw.startMethod("<init>", "(Lorg/ringojs/engine/RhinoEngine;)V", ACC_PUBLIC);
        // Invoke base class constructor
        cfw.add(ByteCode.ALOAD_0);  // this
        cfw.add(ByteCode.ALOAD_1);  // engine
        cfw.addInvoke(ByteCode.INVOKESPECIAL, superName, "<init>",
                "(Lorg/ringojs/engine/RhinoEngine;)V");
        cfw.add(ByteCode.RETURN);
        cfw.stopMethod((short)2); // this

        for (Method method : methods) {
            Class<?>[]paramTypes = method.getParameterTypes();
            int paramLength = paramTypes.length;
            Class<?>returnType = method.getReturnType();
            cfw.startMethod(method.getName(), getSignature(paramTypes, returnType), ACC_PUBLIC);
            cfw.addLoadThis();
            cfw.addLoadConstant(toEventName(method.getName())); // event type
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
            cfw.addInvoke(ByteCode.INVOKEVIRTUAL, className, "emit",
                    "(Ljava/lang/String;[Ljava/lang/Object;)Z");
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

    public static String toEventName(String methodName) {
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
        final RingoWorker worker;
        final Object module;
        final Object function;
        final boolean sync;

        Callback(Scriptable function, boolean sync) {
            Scriptable scope = getTopLevelScope(function);
            if (function instanceof Function) {
                this.module = scope;
                this.function = function;
                this.worker = engine.getCurrentWorker();
            } else {
                this.module = getProperty(function, "module");
                this.function = getProperty(function, "name");
                if (module == NOT_FOUND || module == null) {
                    throw Context.reportRuntimeError(
                            "Callback object must contain 'module' property");
                }
                if (this.function != NOT_FOUND || this.function == null) {
                    throw Context.reportRuntimeError(
                            "Callback object must contain 'app' property");
                }
                this.worker = null;
            }
            this.sync = sync;
        }

        boolean equalsCallback(Scriptable callback) {
            if (callback instanceof Function) {
                return function == callback;
            } else {
                return module.equals(getProperty(callback, "module"))
                        && function.equals(getProperty(callback, "name"));
            }
        }

        void invoke(Object[] args) {
            if (this.worker == null) {
                RingoWorker worker = engine.getWorker();
                try {
                    invokeWithWorker(worker, args);
                } finally {
                    worker.releaseWhenDone();
                }
            } else {
                invokeWithWorker(this.worker, args);
            }
        }

        void invokeWithWorker(RingoWorker worker, Object[] args) {
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


