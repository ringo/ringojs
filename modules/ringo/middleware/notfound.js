/**
 * @fileOverview Middleware for simple Not-Found pages.
 */
var {Response} = require('ringo/webapp/response');

/**
 * Middleware for simple 404-Not-Found pages.
 */
exports.middleware = function(app) {
    return function(request) {
        try {
            return app(request);
        } catch (e if e.notfound) {
            var res = new Response();
            var msg = 'Not Found';
            res.status = 404;
            res.contentType = 'text/html';
            res.writeln('<html><title>', msg, '</title>');
            res.writeln('<body><h2>', msg, '</h2>');
            var path = request.scriptName + request.pathInfo;
            res.writeln('<p>The requested URL', path, 'was not found on the server.</p>');
            res.writeln('</body></html>');
            return res;
        }
    };
};
