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
    return org.apache.log4j.Logger.getLogger(name.replace(/\//g, '.'));
}

// now that getLogger is installed we can get our own log
var log = exports.getLogger(__name__);

/**
 * Render log4j messages to response buffer in the style of helma 1 res.debug().
 */
exports.handleRequest = function handleRequest(req) {
    // Install list in 'responseLog' threadlocal
    if (!responseLogEnabled) {
        return req.process();
    }
    var cx = system.getRhinoContext();
    cx.putThreadLocal('responseLog', new java.util.LinkedList());

    var res = req.process();

    if (res && typeof res === 'object' && typeof res.close === 'function') {
        res = res.close();
    }

    var [status, headers, body] = res;

    if (status != 200 && status < 400) {
        return res;
    }

    var cx = system.getRhinoContext();
    var list = cx.getThreadLocal('responseLog');

    if (list && !list.isEmpty()) {
        if (!(body instanceof Buffer)) {
            body = res[2] = new Buffer(body);
        }
        for (var i = 0; i < list.size(); i++) {
            var item = list.get(i);
            var msg = item[0];
            var multiline = msg && msg.trim().indexOf('\n') > 0 || msg.indexOf('\r')> 0;
            body.write("<div class=\"helma-debug-line\" style=\"background: #fc3;");
            body.write("color: black; border-top: 1px solid black;\">");
            if (multiline) {
                body.write("<pre>").write(msg).write("</pre>");
            } else {
                body.write(msg);
            }
            if (item[1]) {
                body.write("<h4 style='padding-left: 8px; margin: 4px;'>Script Stack</h4>");
                body.write("<pre style='margin: 0;'>", item[1], "</pre>");
            }
            if (item[2]) {
                body.write("<h4 style='padding-left: 8px; margin: 4px;'>Java Stack</h4>");
                body.write("<pre style='margin: 0;'>", item[2], "</pre>");
            }
            body.writeln("</div>");
        }
    }

    return res;
};
