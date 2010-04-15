require('core/string');
var Response = require('ringo/webapp/response').Response;
var engine = require('ringo/engine');
var log = require('ringo/logging').getLogger(module.id);
var Buffer = require('ringo/buffer').Buffer;

module.shared = true;

/**
 * JSGI middleware to display error messages and stack traces.
 */
exports.middleware = function(app) {
    return function(env) {
        try {
            return app(env);
        } catch (error if !error.retry && !error.notfound) {
            return handleError(env, error);
        }
    }
};

function handleError(env, error) {
    var res = new Response();
    res.status = 500;
    res.contentType = 'text/html';
    var msg = String(error).escapeHtml();
    res.writeln('<html><title>', msg, '</title>');
    res.writeln('<body><h1>', msg, '</h1>');
    var errors = engine.getErrors();
    for each (var e in errors) {
        res.writeln(renderSyntaxError(e));
    }
    if (error.fileName && error.lineNumber) {
        res.writeln('<p>In file<b>', error.fileName, '</b>at line<b>', error.lineNumber, '</b></p>');
    }
    if (error.stack) {
        res.writeln('<h3>Script Stack</h3>');
        res.writeln('<pre>', error.stack, '</pre>');        
    }
    if (error.rhinoException) {
        res.writeln('<h3>Java Stack</h3>');
        var writer = new java.io.StringWriter();
        var printer = new java.io.PrintWriter(writer);
        error.rhinoException.printStackTrace(printer);
        res.writeln('<pre>', writer.toString().escapeHtml(), '</pre>');
    }    
    res.writeln('</body></html>');
    log.error(error);
    return res.close();
}

function renderSyntaxError(error) {
    var buffer = new Buffer();
    buffer.write("<div class='stack'>in ").write(error.sourceName);
    buffer.write(", line ").write(error.line);
    buffer.write(": <b>").write(error.message.escapeHtml()).write("</b></div>");
    if (error.lineSource) {
        buffer.write("<pre>").write(error.lineSource.escapeHtml()).write("\n");
        for (var i = 0; i < error.offset - 1; i++) {
            buffer.write(' ');
        }
        buffer.write("<b>^</b></pre>");
    }
    return buffer;
}

