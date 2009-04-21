require('core/string');
import('helma/system', 'system');
include('helma/buffer');

var __shared__ = true;

var configured = false;
var responseLogEnabled = true;

/**
 * Configure log4j using the given file resource.
 * Make sure to set the reset property to true in the <log4j:configuration> header
 * e.g. <log4j:configuration xmlns:log4j='http://jakarta.apache.org/log4j/' reset="true">
 */
exports.setConfig = function(resource) {
    var {path, url} = resource;
    var configurator = path.endsWith('.properties') || path.endsWith('.props') ?
                       org.apache.log4j.PropertyConfigurator :
                       org.apache.log4j.xml.DOMConfigurator;
    configurator.configure(url);
    try {
        configurator.configureAndWatch(path, 2000);
    } catch (e) {
        print("Error watching log configuration file:", e);
    }
    configured = true;
}

/**
 * Get a logger for the given name.
 */
exports.getLogger = function(name) {
    if (!configured) {
        // getResource('foo').name gets us the absolute path to a local resource
        this.setConfig(getResource('config/log4j.properties'));
    }
    return org.apache.log4j.Logger.getLogger(name.replace('/', '.'));
}

// now that getLogger is installed we can get our own log
var log = exports.getLogger(__name__);

/**
 * Render log4j messages to response buffer in the style of helma 1 res.debug().
 */
exports.onRequest = function() {
    // Install list in 'responseLog' threadlocal
    if (responseLogEnabled) {
        var cx = system.getRhinoContext();
        cx.putThreadLocal('responseLog', new java.util.LinkedList());
    }
}

/**
 * Write the log4j response buffer to the main response buffer and reset it.
 * This can either be called manually to insert the log buffer at any given position
 * in the response, or it will called by the log4j response listener after the
 * response has been generated.
 */
exports.onResponse = exports.onError = function(req, res) {
    if (!responseLogEnabled || (res.status != 200 && res.status < 400)) {
        return;
    }
    // flush stuff logged via res.debug()
    res.flushDebug();

    var cx = system.getRhinoContext();
    var list = cx.getThreadLocal('responseLog');

    if (list) {
        for (var i = 0; i < list.size(); i++) {
            var item = list.get(i);
            var msg = item[0];
            var multiline = msg && msg.indexOf('\n') > 0 || msg.indexOf('\r')> 0;
            res.write("<div class=\"helma-debug-line\" style=\"background: #fc3;");
            res.write("color: black; border-top: 1px solid black;\">");
            if (multiline) {
                res.write("<pre>").write(msg).write("</pre>");
            } else {
                res.write(msg);
            }
            if (item[1]) {
                res.write("<h4 style='padding-left: 8px; margin: 4px;'>Script Stack</h4>");
                res.write("<pre style='margin: 0;'>", item[1], "</pre>");
            }
            if (item[2]) {
                res.write("<h4 style='padding-left: 8px; margin: 4px;'>Java Stack</h4>");
                res.write("<pre style='margin: 0;'>", item[2], "</pre>");
            }
            res.writeln("</div>");
        }
    }
};
