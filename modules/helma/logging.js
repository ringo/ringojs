
require('core.string');

var __shared__ = true;

(function() {

    var configured = false;
    var responseLogEnabled = false;
    var self = this;

    /**
     * Configure log4j using the given file resource.
     * Make sure to set the reset property to true in the <log4j:configuration> header
     * e.g. <log4j:configuration xmlns:log4j='http://jakarta.apache.org/log4j/' reset="true">
     */
    this.setConfig = function(resource) {
        var configurator = resource.endsWith('.properties') || resource.endsWith('.props') ?
           org.apache.log4j.PropertyConfigurator :
           org.apache.log4j.xml.DOMConfigurator;
        configurator.configure(resource);
        configurator.configureAndWatch(resource, 2000);
        configured = true;
    }

    /**
     * Get a logger for the given name.
     */
    this.getLogger = function(name) {
        if (!configured) {
            // getResource('foo').name gets us the absolute path to a local resource
            this.setConfig(getResource('log4j.properties').path);
        }
        return org.apache.log4j.Logger.getLogger(name);
    }


    /**
     * Render log4j messages to response buffer in the style of helma 1 res.debug().
     */
    this.enableResponseLog = function() {
        // onLogEvent() callback is called by org.helma.util.RhinoAppender
        var system = require('helma.system');
        system.addCallback("onLogEvent", "responseLog", function(msg, javaStack, scriptStack) {
            if (!global.res) {
                return;
            }
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
        system.addCallback("onResponse", "responseLogFlusher", function(res) {
            if (res.status == 200 || res.status >= 400) {
                self.flushResponseLog();
            }
        });
        responseLogEnabled = true;
    }

    /**
     * Stop log4j response buffer logging.
     */
    this.disableResponseLog = function() {
        // unregister handlers added in startResponseLog()
        var system = require('helma.system');
        system.removeCallback("onLogEvent", "responseLog");
        system.removeCallback("onResponse", "responseLogFlusher");
        responseLogEnabled = false;
    };

    /**
     * Write the log4j response buffer to the main response buffer and reset it.
     * This can either be called manually to insert the log buffer at any given position
     * in the response, or it will called by the log4j response listener after the
     * response has been generated.
     */
    this.flushResponseLog = function() {
        if (global.res) {
            var buffer = res.getBuffer("responseLog");
            res.write(buffer);
            buffer.reset();
        }
    };

    /**
     * Return true if response logging is enabled, false otherwise
     */
    this.responseLogEnabled = function() {
        return responseLogEnabled;
    }

}).call(this);
