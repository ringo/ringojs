/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.invoker.org/download/invoker/license.txt
 *
 * Copyright 2005 Hannes Wallnoefer. All Rights Reserved.
 */

package org.ringo.util;


import java.util.StringTokenizer;

/**
 * Utility class for String manipulation.
 */
public class StringUtils {


    /**
     *  Split a string into an array of strings. Use comma and space
     *  as delimiters.
     * @param str the string to split
     * @return the string split into a string array
     */
    public static String[] split(String str) {
        return split(str, ", \t\n\r\f");
    }

    /**
     *  Split a string into an array of strings.
     * @param str the string to split
     * @param delim the delimiter to split the string at
     * @return the string split into a string array
     */
    public static String[] split(String str, String delim) {
        if (str == null) {
            return new String[0];
        }
        StringTokenizer st = new StringTokenizer(str, delim);
        String[] s = new String[st.countTokens()];
        for (int i=0; i<s.length; i++) {
            s[i] = st.nextToken();
        }
        return s;
    }

    /**
     * Break a string into a string array, using line breaks as delimiters.
     * This supports Unix, Mac and Windows style line breaks.
     * @param str the string to split
     * @return the string split at line breaks
     */
    public static String[] splitLines(String str) {
        if (str == null) {
            return new String[0];
        }
        return str.split("\\r\\n|\\r|\\n");
    }

    public static String join(String[] strings, String separator) {
        StringBuffer buffer = new StringBuffer();
        int length = strings.length;
        for (int i = 0; i < length; i++) {
            buffer.append(strings[i]);
            if (i < length - 1)
                buffer.append(separator);
        }
        return buffer.toString();
    }

    /**
     * Split a string and try to convert to an array of classes.
     * @param str a string containint class names
     * @param delim the delimiter
     * @return an array of classes
     * @throws ClassNotFoundException if any class name contained in the string
     *         couldn't be resolved
     */
    public static Class[] toClassArray(String str, String delim)
            throws ClassNotFoundException {
        String[] s = split(str, delim);
        Class[] classes = new Class[s.length];
        for (int i=0; i<s.length; i++) {
            classes[i] = Class.forName(s[i]);
        }
        return classes;
    }

}
