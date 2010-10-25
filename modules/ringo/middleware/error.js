/**
 * @fileOverview Middleware to catch errors and generate simple error pages.
 */
var strings = require('ringo/utils/strings');
var {Response} = require('ringo/webapp/response');
var engine = require('ringo/engine');
var log = require('ringo/logging').getLogger(module.id);
var {Buffer} = require('ringo/buffer');

/**
 * JSGI middleware to display error messages and stack traces.
 */
exports.middleware = function(app, skin) {
    if (arguments.length == 1) {
        if (typeof app === 'string') {
            skin = app;
            return function(app) {
                return exports.middleware(app, skin);
            };
        } else {
            skin = module.resolve('error.html');
        }
    }
    return function(request) {
        try {
            return app(request);
        } catch (error if !error.retry && !error.notfound) {
            return handleError(request, error, skin);
        }
    }
};

function handleError(request, error, skin) {
    var title, body = new Buffer();
    if (error.fileName && error.lineNumber) {
        body.write('<p>In file <b>')
                .write(error.fileName)
                .write('</b> at line <b>')
                .write(error.lineNumber)
                .writeln('</b>');
    }
    body.writeln.apply(body, engine.getErrors().map(function(e) {
        return e.toHtml();
    }));
    if (error.stack) {
        body.write('<h3>Script Stack</h3><pre>')
                .write(error.stack)
                .write('</pre>');
    }
    /* if (error.rhinoException) {
        var writer = new java.io.StringWriter();
        var printer = new java.io.PrintWriter(writer);
        error.rhinoException.printStackTrace(printer);
        javaStack =  strings.escapeHtml(writer.toString());
    } */

    var res = Response.skin(skin, {
        title: strings.escapeHtml(String(error)),
        body: body
    });
    res.status = 500;
    res.contentType = 'text/html';
    log.error(error);
    return res;
}
