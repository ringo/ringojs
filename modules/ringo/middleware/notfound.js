/**
 * @fileOverview Middleware for simple Not-Found pages.
 */
var {Response} = require('ringo/webapp/response');

/**
 * Middleware for simple 404-Not-Found pages.
 */
exports.middleware = function(app, skin) {
    if (arguments.length == 1) {
        if (typeof app === 'string') {
            skin = app;
            return function(app) {
                return exports.middleware(app, skin);
            };
        } else {
            skin = module.resolve('notfound.html');
        }
    }
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
};
