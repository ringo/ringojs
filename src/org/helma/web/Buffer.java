package org.helma.web;

import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.Function;

import java.io.StringWriter;

/**
 * The Response buffer class. This unites some of the methods of java Writers and StringBuffers.
 */
public class Buffer extends ScriptableObject {

    private StringWriter writer = new StringWriter();
    private static final String CLASSNAME = "Buffer";

    /**
     * Constructor for both prototype and instances.
     */
    public Buffer() {}

    /**
     * Create a new buffer and initialize its parent scope and prototype.
     * @param scope the scope to look for the Buffer constructor
     * @return a buffer ready to be thrown into a script
     */
    public static Buffer createBuffer(Scriptable scope) {
        Buffer buffer = new Buffer();
        buffer.setParentScope(scope);
        buffer.setPrototype(ScriptableObject.getClassPrototype(scope, CLASSNAME));
        return buffer;
    }

    /**
     * Get the current length of the buffer.
     * @return the current buffer length
     */
    public int jsGet_length() {
        return writer.getBuffer().length();
    }

    /**
     * Insert a string at the given position.
     * @param pos the buffer position
     * @param obj the object to insert
     * @return this buffer instance
     */
    public ScriptableObject jsFunction_insert(int pos, Object obj) {
        writer.getBuffer().insert(pos, Context.toString(obj));
        return this;
    }

    /**
     * Append a string to the end of the buffer
     * @param obj the string or object to append
     * @return this buffer instance
     */
    public ScriptableObject jsFunction_append(Object obj) {
        if (obj instanceof CharSequence) {
            writer.append((CharSequence)obj);
        } else {
            writer.write(Context.toString(obj));
        }
        return this;
    }

    /**
     * Cut the buffer at the given position, returning the removed substring.
     * @param pos the index at which to cut the buffer
     * @return the removed substring
     */
    public String jsFunction_truncate(int pos) {
        StringBuffer buffer = writer.getBuffer();
        String tail = buffer.substring(pos);
        buffer.setLength(pos);
        return tail;
    }

    /**
     * Reset the buffer.
     * @return the buffer instance
     */
    public ScriptableObject jsFunction_reset() {
        writer.getBuffer().setLength(0);
        return this;
    }

    /**
     * Write a number of objects to the buffer separated by space characters.
     * @param cx the rhino context
     * @param thisObj the object the method was called on
     * @param args the arguments
     * @param funObj the function object
     * @return the buffer instance
     * @rhinoparam arg Object one ore more objects to write to the response buffer
     */
    public static Object jsFunction_write(Context cx, Scriptable thisObj,
                                        Object[] args, Function funObj) {
        Buffer buf = (Buffer) thisObj;
        buf.write(args);
        return buf;
    }

    /**
     * Write a number of objects to the buffer separated by space characters, terminated by a line break.
     * @param cx the rhino context
     * @param thisObj the object the method was called on
     * @param args the arguments
     * @param funObj the function object
     * @return the buffer instance
     * @rhinoparam arg Object one ore more objects to write to the response buffer
     */
    public static Object jsFunction_writeon(Context cx, Scriptable thisObj,
                                        Object[] args, Function funObj) {
        Buffer buf = (Buffer) thisObj;
        buf.write(args);
        buf.writer.write("\r\n");
        return buf;
    }

    /**
     * Write a number of objects to the buffer separated by space characters.
     * @param args the arguments to write
     * @return the buffer instance
     */
    public ScriptableObject write(Object... args) {
        int length = args.length;
        for (int i = 0; i < length; i++) {
            if (args[i] instanceof CharSequence) {
                writer.append((CharSequence) args[i]);
            } else {
                writer.write(Context.toString(args[i]));
            }
            if (i < length - 1) {
                writer.write(" ");
            }
        }
        return this;
    }

    /**
     * Get the buffer's writer.
     * @return the buffer's writer
     */
    public Object jsGet_writer() {
        return writer;
    }

    /**
     * Get the StringBuffer associated with this buffer.
     * @return  the StringBuffer
     */
    public Object jsGet_stringBuffer() {
        return writer.getBuffer();
    }

    /**
     * Get the string presentation of this buffer.
     * @return the string presentation of this buffer.
     */
    public String jsFunction_toString() {
        return toString();
    }

    /**
     * Return the string presentation of this buffer.
     * @return the string presentation of this buffer.
     */
    public String toString() {
        return writer.getBuffer().toString();
    }

    public String getClassName() {
        return CLASSNAME;
    }
}
