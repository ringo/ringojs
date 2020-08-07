package org.ringojs.security;

import org.mozilla.javascript.RhinoSecurityManager;

import java.security.*;

public class RingoSecurityManager extends RhinoSecurityManager {

    public static final Permission
            GET_CLASSLOADER = new RuntimePermission("getClassLoader");
    public static final Permission
            ACCESS_JAVA = new RingoRuntimePermission("accessJava");
    public static final Permission
            SPAWN_THREAD = new RingoRuntimePermission("spawnThread");

    /**
     * The default security manager does not provide a way to keep code from starting
     * threads. We overide this method to be able to do so by checking the
     * modifyThreadGroup permission on all thread groups, not just the root group.
     * @param g the threadgroup
     */
    @Override
    public void checkAccess(ThreadGroup g) {
        checkPermission(SPAWN_THREAD);
        super.checkAccess(g);
    }

    /**
     * Check if the  top-most application script has permission to access
     * members of Java objects and classes.
     *
     * This checks if the script trying to access a java class or object has the
     * <code>accessEngine</code> RingoRuntimePermission.
     *
     * @exception  SecurityException if the caller does not have
     *             permission to access java classes.
     */
    public void checkJavaAccess() {

        final Class<?> c = getCurrentScriptClass();
        if (c == null) {
            return;
        }

        Boolean allowed = AccessController.doPrivileged((PrivilegedAction<Boolean>) () -> {
            ProtectionDomain pd = c.getProtectionDomain();
            return pd == null || Policy.getPolicy().implies(pd, ACCESS_JAVA) ?
                    Boolean.TRUE : Boolean.FALSE;
        });

        if (!allowed) {
            throw new AccessControlException("Java access denied", ACCESS_JAVA);
        }
    }

}
