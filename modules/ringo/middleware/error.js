/**
 * @fileOverview Middleware to catch errors and generate simple error pages.
 */
var strings = require('ringo/utils/strings');
var {Response} = require('ringo/webapp/response');
var engine = require('ringo/engine');
var log = require('ringo/logging').getLogger(module.id);
var {Buffer} = require('ringo/buffer');

/**
 * Create JSGI middleware to display error messages and stack traces.
 * @example
 * <pre>var app = middleware("templates/error.html")(app);</pre>
 * @param {String} skin the path to a template for rendering error pages (defaults to 'error.html')
 * @returns {Function} a function that can be used to wrap a JSGI app
 */
exports.middleware = function(skin) {
    var app;  // backwards compatibility
    if (typeof skin === 'function') {
        // old non-customizable (app) form
        app = skin;
        skin = undefined;
    }
    if (!skin) {
        skin = module.resolve('error.html');
    }
    function wrap(app) {
        return function(request) {
            try {
                return app(request);
            } catch (error if !error.retry && !error.notfound) {
                return handleError(request, error, skin);
            }
        }
    }
    return app ? wrap(app) : wrap;
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
