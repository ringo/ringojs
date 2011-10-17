package org.ringojs.wrappers;

import org.mozilla.classfile.ByteCode;
import org.mozilla.classfile.ClassFileWriter;
import org.mozilla.javascript.Callable;
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

import java.lang.reflect.Method;
import java.security.CodeSource;
import java.security.ProtectionDomain;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

public class EventAdapter extends ScriptableObject {

    private Map<String,List<Callable>> callbacks = new HashMap<String,List<Callable>>();
    AtomicInteger serial = new AtomicInteger();

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
        Map mapping = null;
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
                mapping = new HashMap<String,List<Callable>>((Map)arg);
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
            byte[] code = getAdapterClass(scope, className, interfaces, mapping);
            Class<?> adapterClass = loadAdapterClass(className, code);
            return adapterClass.getConstructor().newInstance();
        } catch (Exception ex) {
            throw Context.throwAsScriptRuntimeEx(ex);
        }
    }

    @JSFunction
    public void addListener(String type, Object callback) {
        if (!(callback instanceof Callable)) {
            Context.reportError("Event listener must be a function");
        }
        List<Callable> list = callbacks.get(type);
        if (list == null) {
            list = new ArrayList<Callable>();
            callbacks.put(type, list);
        }
        list.add((Callable)callback);
    }

    @JSFunction
    public Object removeListener(String type, Object callback) {
        List<Callable> list = callbacks.get(type);
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
        ((EventAdapter)thisObj).emit(cx, type, fargs);
    }

    public void emit(Context cx, String type, Object... args) {
        List<Callable> list = callbacks.get(type);
        if (list != null) {
            if (cx == null) {
                cx = Context.getCurrentContext();
            }
            for (Callable callback : list) {
                callback.call(cx, null, null, args);
            }
        }
    }

    private static byte[] getAdapterClass(Scriptable scope, String className,
                                           List<Class<?>> interfaces,
                                           Map mapping) {
        String superName = EventAdapter.class.getName();
        ClassFileWriter cfw = new ClassFileWriter(className,
                                                  superName,
                                                  "<EventAdapter>");
        for (Class<?> interf : interfaces) {
            cfw.addInterface(interf.getName());
            // Method[] methods = interf.getMethods();
            // TODO
        }

        cfw.startMethod("<init>", "()V", ClassFileWriter.ACC_PUBLIC);
        // Invoke base class constructor
        cfw.add(ByteCode.ALOAD_0);  // this
        cfw.addInvoke(ByteCode.INVOKESPECIAL, superName, "<init>", "()V");
        cfw.add(ByteCode.RETURN);
        cfw.stopMethod((short)1); // this

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

}


