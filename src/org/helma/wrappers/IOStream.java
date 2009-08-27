package org.helma.wrappers;

import org.mozilla.javascript.*;
import org.helma.util.ScriptUtils;

import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;

/**
 * <p>A CommonJS-compliant wrapper around a Java input or output stream. To
 * register IOStream as a host object in Rhino call the <code>defineClass()</code> function
 * with this class.</p>
 *
 * <pre><code>defineClass(org.helma.wrappers.IOStream);</code></pre>
 *
 * <p>To create an IOStream wrapper around an instance of <code>java.io.InputStream</code>
 * or <code>java.io.OutputStream</code> call the constructor with the stream as argument:</p>
 *
 * <pre><code>var io = new IOStream(javaInputStream);</code></pre>
 *
 * <p>When passed to a Java method that expects an input or output stream, IOStream wrappers
 * are automatically unwrapped. use the {@link #unwrap()} method to explicitly get the
 * wrapped stream.</p>
 */
public class IOStream extends ScriptableObject implements Wrapper {

    private InputStream input;
    private OutputStream output;

    private final static String CLASSNAME = "IOStream";

    public IOStream() {
        input = null;
        output = null;
    }

    public IOStream(Scriptable scope, Object arg) {
        super(scope, ScriptUtils.getClassOrObjectProto(scope, CLASSNAME));
        jsConstructor(arg);
    }

    public void jsConstructor(Object arg) {
        if (arg instanceof Wrapper) {
            arg = ((Wrapper) arg).unwrap();
        }
        if (arg instanceof InputStream) {
            input = (InputStream) arg;
            output = null;
        } else if (arg instanceof OutputStream) {
            output = (OutputStream) arg;
            input = null;
        } else {
            throw ScriptRuntime.typeError("Unsupported argument: " + arg);
        }
    }

    public Object jsFunction_read(Object limit) {
        if (input == null) {
            throw ScriptRuntime.typeError("no input stream");
        }
        int max = limit == Undefined.instance ? -1 : ScriptRuntime.toInt32(limit);
        Scriptable scope = ScriptableObject.getTopLevelScope(this);
        if (max > -1) {
            try {
                byte[] bytes = new byte[max];
                int read = input.read(bytes);
                ByteArray b = new ByteArray(scope, bytes);
                b.setLength(read);
                return b;
            } catch (IOException iox) {
                throw new WrappedException(iox);
            }
        } else {
            Context cx = Context.getCurrentContext();
            return cx.newObject(scope, "ByteArray", new Object[] {input});
        }
    }

    public int readInto(ByteArray bytes, Object offset, Object length) {
        if (input == null) {
            throw ScriptRuntime.typeError("no input stream");
        }
        int off = offset == Undefined.instance ? -1 : ScriptRuntime.toInt32(offset);
        int len = length == Undefined.instance ? -1 : ScriptRuntime.toInt32(length);
        try {
            if (off > -1) {
                if (len > -1) {
                    bytes.ensureCapacity(off + len);
                } else {
                    bytes.ensureCapacity(off + 1);
                    len = bytes.jsGet_length() - off;
                }
                byte[] b = bytes.getBytes();
                return input.read(b, off, len);
            } else {
                return input.read(bytes.getBytes());
            }
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public void jsFunction_write(ByteArray bytes, Object offset, Object length) {
        if (output == null) {
            throw ScriptRuntime.typeError("no output stream");
        }
        try {
            output.write(bytes.getBytes());
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public void jsFunction_flush() {
        if (output == null) {
            throw ScriptRuntime.typeError("no output stream");
        }
        try {
            output.flush();
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public void jsFunction_close() {
        try {
            if (output != null) {
                output.close();
            } else if (input != null) {
                input.close();
            }
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    public Object jsFunction_unwrap() {
        return new NativeJavaObject(getParentScope(), unwrap(), null);
    }

    /**
     * Unwrap the object by returning the wrapped value.
     * @return a wrapped value
     */
    public Object unwrap() {
        return input != null ? input : output;
    }

    /**
     * Return the name of the class.
     * @return the class name
     */
    public String getClassName() {
        return CLASSNAME;
    }
}
