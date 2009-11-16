include('helma/engine');
include('helma/buffer');
include('helma/webapp/util');

var Logger = org.apache.log4j.Logger;
var responseLogEnabled = true;

/**
 * Render log4j messages to response buffer in the style of helma 1 res.debug().
 */
exports.middleware = function(app) {
    return function(env) {
        var appender;

        if (!responseLogEnabled || !(appender = Logger.getRootLogger().getAppender("rhino"))) {
            return app(env);
        }

        var messages = [];
        appender.callback = function(level, message, scriptStack, javaStack) {
            messages.push([level, message, scriptStack, javaStack]);
        };

        var res;
        try {
            res = app(env);
        } finally {
            appender.callback = null;
        }

        var {status, headers, body} = res;

        // only do this for ordinary HTML responses
        var contentType = Headers(headers).get("content-type");
        if (status != 200 && status < 400 || !contentType || !contentType.startsWith("text/html")) {
            return res;
        }

        if (messages.length > 0) {
            var ResponseFilter = require("helma/webapp/util").ResponseFilter;
            res.body = new ResponseFilter(body, function(part) {
                if (typeof part != "string" || part.lastIndexOf("</body>") == -1) {
                    return part;
                }
                return injectMessages(part, messages);
            });
        }
        return res;
    }
}

function injectMessages(part, messages) {
    var buffer = new Buffer();
    for (var i = 0; i < messages.length; i++) {
        appendMessage(buffer, messages[i]);
    }
    var insert = part.lastIndexOf("</body>");
    return part.substring(0, insert) + buffer + part.substring(insert);
}

function appendMessage(buffer, item) {
    var [level, message, jsstack, javastack] = item;
    var multiline = message
            && (message.trim().indexOf('\n') > 0 || message.indexOf('\r')> 0);
    var bgcolor = colors[level.toString()] || '#fff';
    buffer.write("<div class='helma-debug-line' style='background:", bgcolor,
                 "; color: black; border-top: 1px solid black;'>");
    if (multiline) {
        buffer.write("<pre>", message, "</pre>");
    } else {
        buffer.write(message);
    }
    appendStackTrace(buffer, "Script Stack", jsstack);
    appendStackTrace(buffer, "Java Stack", javastack);
    buffer.writeln("</div>");
}

function appendStackTrace(buffer, header, stack) {
    if (stack) {
        buffer.write("<h4 style='padding-left: 8px; margin: 4px;'>");
        buffer.write(header);
        buffer.write("</h4>");
        buffer.write("<pre style='margin: 0;'>", stack, "</pre>");
    }
}

var colors = {
    DEBUG: '#fff',
    INFO: '#ff6',
    WARN: '#ff0',
    ERROR: '#f90',
    FATAL: '#f30'
}