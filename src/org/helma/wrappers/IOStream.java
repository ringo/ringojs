package org.helma.wrappers;

import org.mozilla.javascript.*;
import org.mozilla.javascript.annotations.JSFunction;
import org.mozilla.javascript.annotations.JSConstructor;
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
        init(arg);
    }

    @JSConstructor
    public void init(Object arg) {
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

    @JSFunction
    public Object read(Object limit) {
        if (input == null) {
            throw ScriptRuntime.typeError("no input stream");
        }
        int max = limit == Undefined.instance ? -1 : ScriptRuntime.toInt32(limit);
        Scriptable scope = ScriptableObject.getTopLevelScope(this);
        if (max > -1) {
            try {
                byte[] bytes = new byte[max];
                int read = input.read(bytes);
                Binary b = new Binary(scope, Binary.Type.ByteArray, bytes);
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

    @JSFunction
    public int readInto(Binary bytes, Object offset, Object length) {
        if (input == null) {
            throw ScriptRuntime.typeError("no input stream");
        }
        int off = ScriptUtils.toInt(offset, -1);
        int len = ScriptUtils.toInt(length, -1);
        try {
            if (off > -1) {
                if (len > -1) {
                    bytes.ensureLength(off + len);
                } else {
                    bytes.ensureLength(off + 1);
                    len = bytes.getLength() - off;
                }
                byte[] b = bytes.getBytes();
                return input.read(b, off, len);
            } else {
                return input.read(bytes.getBytes());
            }
            // FIXME: should we set the length of the byte buffer to the number of read bytes?
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    @JSFunction
    public void write(Binary bytes, Object offset, Object length) {
        if (output == null) {
            throw ScriptRuntime.typeError("no output stream");
        }
        int off = offset == Undefined.instance ? -1 : ScriptRuntime.toInt32(offset);
        int len = length == Undefined.instance ? -1 : ScriptRuntime.toInt32(length);
        try {
            byte[] b = bytes.getBytes();
            if (off > -1) {
                if (len < 0) {
                    len = b.length - off;
                }
                output.write(b, off, len);
            } else {
                output.write(bytes.getBytes());
            }
        } catch (IOException iox) {
            throw Context.throwAsScriptRuntimeEx(iox);
        }
    }

    @JSFunction
    public void flush() {
        if (output == null) {
            throw ScriptRuntime.typeError("no output stream");
        }
        try {
            output.flush();
        } catch (IOException iox) {
            throw new WrappedException(iox);
        }
    }

    @JSFunction
    public void close() {
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

    @JSFunction("unwrap")
    public Object jsunwrap() {
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
