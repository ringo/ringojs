require('core/string');
include('helma/system');
include('helma/buffer');

importPackage(org.apache.log4j);
importClass(org.apache.log4j.xml.DOMConfigurator);

var __shared__ = true;

var configured = false;
var responseLogEnabled = true;

/**
 * Configure log4j using the given file resource.
 * Make sure to set the reset property to true in the <log4j:configuration> header
 * e.g. <log4j:configuration xmlns:log4j='http://jakarta.apache.org/log4j/' reset="true">
 */
var setConfig = exports.setConfig = function(resource) {
    var {path, url} = resource;
    var configurator = path.endsWith('.properties') || path.endsWith('.props') ?
                       PropertyConfigurator : DOMConfigurator;
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
var getLogger = exports.getLogger = function(name) {
    if (!configured) {
        // getResource('foo').name gets us the absolute path to a local resource
        this.setConfig(getResource('config/log4j.properties'));
    }
    return Logger.getLogger(name.replace(/\//g, '.'));
}

// now that getLogger is installed we can get our own log
var log = getLogger(__name__);

/**
 * Render log4j messages to response buffer in the style of helma 1 res.debug().
 */
exports.handleRequest = function handleRequest(req) {
    // Install list in 'responseLog' threadlocal
    if (!responseLogEnabled) {
        return req.process();
    }

    var messages = [];
    var appender = Logger.getRootLogger().getAppender("rhino") || {};

    appender.callback = function(message, scriptStack, javaStack) {
        messages.push([message, scriptStack, javaStack]);
    };

    var res;
    try {
        res = req.process();
    } finally {
        appender.callback = null;
    }

    if (res && typeof res === 'object' && typeof res.close === 'function') {
        res = res.close();
    }

    if (res[0] != 200 && res[0] < 400) {
        return res;
    }

    if (messages.length > 0) {
        var ResponseFilter = require("helma/webapp/util").ResponseFilter;
        res[2] = new ResponseFilter(res[2], function(part) {
            if (typeof part != "string" && part.lastIndexOf("</body>") == -1) {
                return part;
            }
            var buffer = new Buffer();
            for (var i = 0; i < messages.length; i++) {
                var item = messages[i];
                var msg = item[0];
                var multiline = msg && msg.trim().indexOf('\n') > 0 || msg.indexOf('\r')> 0;
                buffer.write("<div class=\"helma-debug-line\" style=\"background: #fc3;");
                buffer.write("color: black; border-top: 1px solid black;\">");
                if (multiline) {
                    buffer.write("<pre>").write(msg).write("</pre>");
                } else {
                    buffer.write(msg);
                }
                if (item[1]) {
                    buffer.write("<h4 style='padding-left: 8px; margin: 4px;'>Script Stack</h4>");
                    buffer.write("<pre style='margin: 0;'>", item[1], "</pre>");
                }
                if (item[2]) {
                    buffer.write("<h4 style='padding-left: 8px; margin: 4px;'>Java Stack</h4>");
                    buffer.write("<pre style='margin: 0;'>", item[2], "</pre>");
                }
                buffer.writeln("</div>");
            }
            var insert = part.lastIndexOf("</body>");
            return part.substring(0, insert) + buffer + part.substring(insert);
        });
    }

    return res;
};
