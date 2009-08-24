package org.helma.util;

import org.mozilla.javascript.*;

import java.io.InputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;

public class ByteArray extends ScriptableObject implements Wrapper {

    private byte[] bytes;
    private int length;

    public ByteArray() {}

    public ByteArray(Object arg, Object encoding) {
        if (arg instanceof Wrapper) {
            arg = ((Wrapper) arg).unwrap();
        }
        if (encoding != Undefined.instance) {
            if (!(arg instanceof String)) {
                throw ScriptRuntime.typeError("Expected string as first argument");
            } else if (!(encoding instanceof String)) {
                throw ScriptRuntime.typeError("Expected string as second argument");
            }
            try {
                bytes = ((String) arg).getBytes((String) encoding);
                length = bytes.length;
            } catch (UnsupportedEncodingException uee) {
                throw ScriptRuntime.typeError("Unsupported encoding: " + encoding);
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
    public Object get(int i, Scriptable scriptable) {
        if (i < 0 || i >= length) {
            return Undefined.instance;
        }
        return Integer.valueOf(0xff & bytes[i]);
    }

    @Override
    public boolean has(int i, Scriptable scriptable) {
        return i >= 0 && i < length;
    }

    @Override
    public void put(int i, Scriptable scriptable, Object value) {
        if (i < 0) {
            throw ScriptRuntime.typeError("Negative ByteArray index");
        }
        if (!(value instanceof Number)) {
            throw ScriptRuntime.typeError("Non-numeric ByteArray member: " + value);
        }
        if (i >= bytes.length) {
            setSize(i + 1);
        }
        int n = ((Number) value).intValue();
        bytes[i] = (byte) (0xff & n);
    }

    public int jsGet_length() {
        return length;
    }

    public void jsSet_length(int l) {
        setSize(l);
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
}