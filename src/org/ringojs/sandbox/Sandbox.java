package org.ringojs.sandbox;

import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.annotations.JSFunction;
import org.mozilla.javascript.annotations.JSGetter;

import java.io.InputStream;
import java.io.PrintStream;
import java.io.PrintWriter;

/**
 *
 */
public class Sandbox extends ScriptableObject {


    @Override
    public String getClassName() {
        return "Sandbox";
    }

    @JSGetter("stdout")
    public PrintStream getStdout()
    {
        return System.out;
    }

    @JSGetter("stderr")
    public PrintStream getStderr()
    {
        return System.err;
    }
}
