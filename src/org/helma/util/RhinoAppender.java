package org.helma.util;

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.Layout;
import org.apache.log4j.spi.LoggingEvent;
import org.helma.javascript.RhinoEngine;
import org.mozilla.javascript.Context;

/**
 * A log4j appender that passes log events to a Rhino callback function
 * named <code>onLogEvent</code>.
 *
 * @see org.helma.javascript.RhinoEngine#addCallback(String, String, org.mozilla.javascript.Function)
 * @see org.helma.javascript.RhinoEngine#invokeCallback(String, Object, Object[])
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
        RhinoEngine engine = (RhinoEngine) cx.getThreadLocal("engine");
        if (engine == null) {
            return;
        }

        if(this.layout == null) {
            errorHandler.error("No layout set for the appender named ["+ name+"].");
            return;
        }


        String message = this.layout.format(event);
        String throwable = null;

        if(layout.ignoresThrowable()) {
            String[] s = event.getThrowableStrRep();
            if (s != null) {
                StringBuffer buffer = new StringBuffer();
                int len = s.length;
                for(int i = 0; i < len; i++) {
     	            buffer.append(s[i]);
     	            buffer.append(Layout.LINE_SEP);
     	        }
                throwable = buffer.toString();
            }
        }

        if (throwable == null) {
            engine.invokeCallback("onLogEvent", null, message);
        } else {
            engine.invokeCallback("onLogEvent", null, message, throwable);
        }

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
