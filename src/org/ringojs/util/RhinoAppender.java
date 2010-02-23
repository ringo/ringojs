package org.ringojs.util;

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.Layout;
import org.apache.log4j.spi.LoggingEvent;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.RhinoException;
import org.mozilla.javascript.Function;

/**
 * A log4j appender that passes log events to a Rhino callback function
 * named <code>onLogEvent</code>.
 */
public class RhinoAppender extends AppenderSkeleton {

    private static ThreadLocal<Function> callback = new ThreadLocal<Function>();

    /**
     * Invoke the callback, passing the log message and the stack trace rendered
     * as a string as optional second argument. 
     * @param event the log event
     */
    protected void append(LoggingEvent event) {
        Context cx = Context.getCurrentContext();
        Function cb = callback.get();
        if (cx == null || cb == null) {
            return;
        }

        if(this.layout == null) {
            errorHandler.error("No layout set for the appender named ["+ name+"].");
            return;
        }


        String message = this.layout.format(event);
        String javaStack = null;
        String scriptStack = null;

        if(layout.ignoresThrowable()) {
            String[] s = event.getThrowableStrRep();
            if (s != null) {
                StringBuffer buffer = new StringBuffer();
                int len = s.length;
                for(int i = 0; i < len; i++) {
     	            buffer.append(s[i]);
     	            buffer.append(Layout.LINE_SEP);
     	        }
                javaStack = buffer.toString();
                Throwable t = event.getThrowableInformation().getThrowable();
                if (t instanceof RhinoException) {
                    scriptStack = ((RhinoException) t).getScriptStackTrace();
                }
            }
        }

        Object[] args = new Object[] {event.getLevel(), message, scriptStack, javaStack};
        cb.call(cx, cb.getParentScope(), null, args);
    }

    public static Function getCallback() {
        return callback.get();
    }

    public static void setCallback(Function callback) {
        RhinoAppender.callback.set(callback);
    }

    /**
     * We need a layout, so this returns true.
     * @return true
     */
    public boolean requiresLayout() {
        return true;
    }

    /**
     * Close the appender.
     */
    public void close() {
        closed = true;
    }
}
