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

            var res = Response.skin(module.resolve("notfound.html"), {
                title: "Not Found",
                body: "<p>The requested URL <b>" + request.scriptName
                        + request.pathInfo + "</b> was not found on the server.</p>"
            });
            res.status = 404;
            res.contentType = 'text/html';
            return res;
        }
    };
};
