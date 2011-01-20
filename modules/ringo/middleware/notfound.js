/**
 * @fileOverview Middleware for simple Not-Found pages.
 */
var {Response} = require('ringo/webapp/response');

/**
 * Create middleware for simple 404-Not-Found pages.
 * @example
 * <pre>var app = middleware("templates/404.html")(app);</pre>
 * @param {String} skin the path to a template for rendering 404 pages (defaults to 'notfound.html')
 * @returns {Function} a function that can be used to wrap a JSGI app
 */
exports.middleware = function(skin) {
    var app; // backwards compatibility
    if (typeof skin === 'function') {
        // old non-customizable (app) form
        app = skin;
        skin = undefined;
    }
    if (!skin) {
        skin = module.resolve('notfound.html');
    }
    function wrap(app) {
        return function(request) {
            try {
                return app(request);
            } catch (e if e.notfound) {
                var res = Response.skin(skin, {
                    title: "Not Found",
                    body: "<p>The requested URL <b>" + request.scriptName
                            + request.pathInfo + "</b> was not found on the server.</p>"
                });
                res.status = 404;
                res.contentType = 'text/html';
                return res;
            }
        };
    }
    return app ? wrap(app) : wrap;
};
