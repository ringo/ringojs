package org.helma.util;

import org.apache.log4j.Logger;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.debug.DebugFrame;
import org.mozilla.javascript.debug.DebuggableScript;
import org.mozilla.javascript.debug.Debugger;

/**
 * A base class for Debuggers and Profilers implemented in Javascript.
 * This allows to exclude the debugger/profiler module and all modules
 * it uses to be excluded from debugging/profiling.
 */
public abstract class DebuggerBase implements Debugger {

    String debuggerScript;
    int debuggerScriptDepth = 0;
    Logger log = Logger.getLogger("org.helma.util.DebuggerBase");

    public void setDebuggerScript(String path) {
        debuggerScript = path;
    }

    public DebugFrame getFrame(Context cx, DebuggableScript fnOrScript) {
        String path = fnOrScript.getSourceName();
        log.debug("Getting Frame for " + path +
                ", debugger script depth is " + debuggerScriptDepth);
        if (path.equals(debuggerScript) || debuggerScriptDepth > 0) {
            return new DebuggerScriptFrame();
        } else {
            return getScriptFrame(cx, fnOrScript);
        }
    }

    /**
     * Get a string representation for the given script
     * @param script a function or script
     * @return the file and/or function name of the script
     */
    static String getScriptName(DebuggableScript script) {
        if (script.isFunction()) {
            return script.getSourceName() + ": " + script.getFunctionName();
        } else {
            return script.getSourceName();
        }
    }

    public abstract void handleCompilationDone(Context cx, DebuggableScript fnOrScript, String source);
    
    public abstract DebugFrame getScriptFrame(Context cx, DebuggableScript fnOrScript);

    class DebuggerScriptFrame implements DebugFrame {

        public void onEnter(Context cx, Scriptable activation, Scriptable thisObj, Object[] args) {
            log.debug("Entering debugger script frame");
            debuggerScriptDepth ++;
        }

        public void onExit(Context cx, boolean byThrow, Object resultOrException) {
            log.debug("Exiting debugger script frame");
            debuggerScriptDepth --;
        }

        public void onLineChange(Context cx, int lineNumber) {}

        public void onExceptionThrown(Context cx, Throwable ex) {}

        public void onDebuggerStatement(Context cx) {}
    }
   
}
