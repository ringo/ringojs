importModule('core.string');
importModule('helma.rhino', 'rhino');

var __shared__ = true;
var configured = false;

/**
 * Configure log4j using the given file resource.
 * Make sure to set the reset property to true in the <log4j:configuration> header
 * e.g. <log4j:configuration xmlns:log4j='http://jakarta.apache.org/log4j/' reset="true">
 */
function setConfig(resource) {
    if (resource.endsWith('.properties') || resource.endsWith('.props')) {
       org.apache.log4j.PropertyConfigurator.configure(resource);
    } else {
       org.apache.log4j.xml.DOMConfigurator.configure(resource);
    }
    configured = true;
}

/**
 * Get a logger for the given name.
 */
function getLogger(name) {
    if (!configured) {
        // getResource('foo').name gets us the absolute path to a local resource
        setConfig(getResource('log4j.properties').name);
    }
    return org.apache.log4j.Logger.getLogger(name);
}


/**
 * Render log4j messages to response buffer in the style of helma 1 res.debug().
 */
function enableResponseLog() {
    // onLogEvent() callback is called by org.helma.util.RhinoAppender
    rhino.addCallback("onLogEvent", "responseLog", function(msg, javaStack, scriptStack) {
        var buffer = res.getBuffer("responseLog");
        buffer.write("<div class=\"helma-debug-line\" style=\"background: #fc3;");
        buffer.write("color: black; border-top: 1px solid black;\">");
        buffer.write(msg);
        if (scriptStack) {
            buffer.write("<h4 style='padding-left: 8px; margin: 4px;'>Script Stack</h4>");
            buffer.write("<pre style='margin: 0;'>", scriptStack, "</pre>");
        }
        if (javaStack) {
            buffer.write("<h4 style='padding-left: 8px; margin: 4px;'>Java Stack</h4>");
            buffer.write("<pre style='margin: 0;'>", javaStack, "</pre>");
        }
        buffer.writeln("</div>");
        return null;
    });
    // add an onResponse callback to automatically flush the response log
    rhino.addCallback("onResponse", "responseLogFlusher", function(res) {
        if (res.status == 200 || res.status >= 400) {
            flushResponseLog();
        }
    });
}

/**
 * Stop log4j response buffer logging.
 */
function disableResponseLog() {
    // unregister handlers added in startResponseLog()
    rhino.removeCallback("onLogEvent", "responseLog");
    rhino.removeCallback("onResponse", "responseLogFlusher");
}

/**
 * Write the log4j response buffer to the main response buffer and reset it.
 * This can either be called manually to insert the log buffer at any given position
 * in the response, or it will called by the log4j response listener after the
 * response has been generated.
 */
function flushResponseLog() {
    var buffer = res.getBuffer("responseLog");
    res.write(buffer);
    buffer.reset();
    return null;
};

