package org.helma.util;

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.Layout;
import org.apache.log4j.spi.LoggingEvent;
import org.helma.javascript.RhinoEngine;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.RhinoException;

import java.util.List;

/**
 * A log4j appender that passes log events to a Rhino callback function
 * named <code>onLogEvent</code>.
 */
public class RhinoAppender extends AppenderSkeleton {

    /**
     * Tries to get the current {@link RhinoEngine} and invoke a callback named
     * <code>onLogEvent</code>, passing the log message and the stack trace rendered
     * as a string as optional second argument. 
     * @param event the log event
     */
    protected void append(LoggingEvent event) {
        Context cx = Context.getCurrentContext();
        if (cx == null) {
            return;
        }
        Object responseLog = cx.getThreadLocal("responseLog");
        if (responseLog == null || !(responseLog instanceof List)) {
            return;
        }

        List logList = (List) responseLog;

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

        logList.add(new String[] {message, scriptStack, javaStack});

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
