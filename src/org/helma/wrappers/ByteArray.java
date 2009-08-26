package org.helma.wrappers;

import org.mozilla.javascript.*;

import java.io.InputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;

public class ByteArray extends ScriptableObject implements Wrapper {

    private byte[] bytes;
    private int length;

    public ByteArray() {}

    public ByteArray(Object arg, Object charset) {
        if (arg instanceof Wrapper) {
            arg = ((Wrapper) arg).unwrap();
        }
        if (charset != Undefined.instance) {
            if (!(arg instanceof String)) {
                throw ScriptRuntime.typeError("Expected string as first argument");
            } else if (!(charset instanceof String)) {
                throw ScriptRuntime.typeError("Expected string as second argument");
            }
            try {
                bytes = ((String) arg).getBytes((String) charset);
                length = bytes.length;
            } catch (UnsupportedEncodingException uee) {
                throw ScriptRuntime.typeError("Unsupported encoding: " + charset);
            }
        } else if (arg instanceof Number) {
            length = ((Number) arg).intValue();
            bytes = new byte[length];
        } else if (arg instanceof NativeArray) {
            NativeArray array = (NativeArray) arg;
            Integer ids[] = array.getIndexIds();
            length = ids.length;
            bytes = new byte[length];
            for (int id : ids) {
                Object value = array.get(id, array);
                put(id, this, value);
            }
        } else if (arg instanceof byte[]) {
            bytes = (byte[]) arg;
            length = bytes.length;
        } else if (arg instanceof InputStream) {
            InputStream in = (InputStream) arg;
            byte[] buffer = new byte[1024];
            int read, count = 0;
            try {
                while ((read = in.read(buffer, count, buffer.length - count)) > -1) {
                    count += read;
                    if (count == buffer.length) {
                        byte[] b = new byte[buffer.length * 2];
                        System.arraycopy(buffer, 0, b, 0, count);
                        buffer = b;
                    }
                }
                bytes = buffer;
                length = count;
                in.close();
            } catch (IOException iox) {
                throw ScriptRuntime.typeError("Error initalizing ByteArray from input stream: " + iox);
            }
        } else if (arg == Undefined.instance) {
            bytes = new byte[0];
            length = 0;
        } else {
            throw ScriptRuntime.typeError("Unsupported argument: " + arg);
        }
    }

    @Override
    public Object get(int index, Scriptable start) {
        if (index < 0 || index >= length) {
            return Undefined.instance;
        }
        return Integer.valueOf(0xff & bytes[index]);
    }

    @Override
    public boolean has(int index, Scriptable start) {
        return index >= 0 && index < length;
    }

    @Override
    public void put(int index, Scriptable start, Object value) {
        if (index < 0) {
            throw ScriptRuntime.typeError("Negative ByteArray index");
        }
        if (!(value instanceof Number)) {
            throw ScriptRuntime.typeError("Non-numeric ByteArray member: " + value);
        }
        if (index >= bytes.length) {
            setSize(index + 1);
        }
        int n = ((Number) value).intValue();
        bytes[index] = (byte) (0xff & n);
    }

    public int jsGet_length() {
        return length;
    }

    public void jsSet_length(int l) {
        setSize(l);
    }

    public int jsFunction_get(int index) {
        if (index < 0 || index >= length) {
            return 0;
        }
        return 0xff & bytes[index];
    }

    public Object jsFunction_toByteArray() {
        return this;
    }

    public String jsFunction_decodeToString(Object charset) {
        String cs = toCharset(charset);
        try {
            return cs == null ?
                    new String(bytes, 0, length) : 
                    new String(bytes, 0, length, cs);
        } catch (UnsupportedEncodingException uee) {
            throw ScriptRuntime.typeError("Unsupported encoding: " + charset);
        }
    }

    public int jsFunction_indexOf(int n) {
        byte b = (byte) (0xff & n);
        for (int i = 0; i < length; i++) {
            if (bytes[i] == b)
                return i;
        }
        return -1;
    }

    public int jsFunction_lastIndexOf(int n) {
        byte b = (byte) (0xff & n);
        for (int i = length - 1; i >= 0; i--) {
            if (bytes[i] == b)
                return i;
        }
        return -1;
    }

    /**
     * Unwrap the object by returning the wrapped value.
     *
     * @return a wrapped value
     */
    public Object unwrap() {
        normalize();
        return bytes;
    }

    public String getClassName() {
        return "ByteArray";
    }

    private synchronized void normalize() {
        if (length != bytes.length) {
            byte[] b = new byte[length];
            System.arraycopy(bytes, 0, b, 0, length);
            bytes = b;
        }
    }

    private synchronized void setSize(int size) {
        if (size < 0) {
            throw ScriptRuntime.typeError("Negative ByteArray length");
        }
        byte[] b = new byte[size];
        System.arraycopy(bytes, 0, b, 0, Math.min(length, size));
        bytes = b;
        length = size;
    }

    private String toCharset(Object charset) {
        if (charset != Undefined.instance && !(charset instanceof String)) {
            throw ScriptRuntime.typeError("Unsupported charset: " + charset);
        }
        return charset instanceof String ? (String) charset : null;
    }
}
