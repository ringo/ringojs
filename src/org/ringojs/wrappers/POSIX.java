package org.ringojs.wrappers;

import org.ringojs.util.POSIXSupport;

/**
 * A wrapper class to allow retrieving jnr-posix support while protecting
 * the caller against NoClassDefFoundError if jnr-posix support is not installed.
 */
public class POSIX {

    public static Object getPOSIX() throws ClassNotFoundException {
        try {
            return POSIXSupport.getPOSIX();
        } catch (NoClassDefFoundError noclass) {
            throw new ClassNotFoundException(noclass.getMessage(), noclass);
        }
    }
}
