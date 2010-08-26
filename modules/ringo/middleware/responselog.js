var numbers = require('ringo/utils/numbers');
var strings = require('ringo/utils/strings');
var Buffer = require('ringo/buffer').Buffer;
var logging = require('ringo/logging');
var {Headers, ResponseFilter} = require('ringo/webapp/util');

var responseLogEnabled = true;

/**
 * Render log4j messages to response buffer in the style of helma 1 res.debug().
 */
exports.middleware = function(app) {
    return function(request) {
        if (!responseLogEnabled) {
            return app(request);
        }

        var messages = [];
        var res;
        var start = Date.now();
        try {
            logging.setInterceptor(messages);
            res = app(request);
        } finally {
            logging.setInterceptor(null);
        }

        var {status, headers, body} = res;

        // only do this for ordinary HTML responses
        var contentType = Headers(headers).get("content-type");
        if (status != 200 && status < 400 || !contentType || !strings.startsWith(contentType, "text/html")) {
            return res;
        }

        if (messages.length > 0) {
            res.body = new ResponseFilter(body, function(part) {
                if (typeof part != "string" || part.lastIndexOf("</body>") == -1) {
                    return part;
                }
                return injectMessages(part, messages, start);
            });
        }
        return res;
    }
}

function injectMessages(part, messages, start) {
    var buffer = new Buffer();
    for (var i = 0; i < messages.length; i++) {
        appendMessage(buffer, messages[i], start);
    }
    var insert = part.lastIndexOf("</body>");
    return part.substring(0, insert) + buffer + part.substring(insert);
}

function appendMessage(buffer, item, start) {
    var [time, level, name, message] = item;
    var multiline = message
            && (message.trim().indexOf('\n') > 0 || message.indexOf('\r')> 0);
    var bgcolor = colors[level] || '#fff';
    buffer.write("<div class='ringo-debug-line' style='background:", bgcolor,
                 "; color: black; border-top: 1px solid black; clear: both;'>");
    var timePassed = numbers.format(time - start, "00000");
    var formatted = strings.format("{} [{}] {}: {}", timePassed, level, name, message);
    if (multiline) {
        buffer.write("<pre>", formatted, "</pre>");
    } else {
        buffer.write(formatted);
    }
    buffer.writeln("</div>");
}

var colors = {
    TRACE: '#fff',
    DEBUG: '#fff',
    INFO: '#ff6',
    WARN: '#ff0',
    ERROR: '#f90',
    FATAL: '#f30'
};
