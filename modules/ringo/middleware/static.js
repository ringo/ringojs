/**
 * @fileOverview Middleware for serving static resources.
 */

var {Response} = require("ringo/webapp/response");
var {mimeType} = require("ringo/webapp/mime");

/**
 * Middleware for serving static resources.
 *
 * #### Configuration properties
 *
 *  The `config` object may contain the following properties:
 *  - `base`: the base resource directory (required)
 *  - `index`: the name of a file to serve if the path matches a directory (e.g.
 *    "index.html")
 *
 * @param {Object} config configuration properties
 * @returns {Function} a function that can be used to wrap a JSGI app
 */
exports.middleware = function(config) {
    var index, base;
    if (typeof config === "string" || config instanceof org.ringojs.repository.Repository) {
        base = config;
    } else {
        base = config.base;
        index = config.index;
    }
    if (typeof base === "string") {
        base = getRepository(base);
    }
    base.setRoot();
    return function(app) {
        return function(request) {
            var path = request.pathInfo;
            if (index && path.charAt(path.length-1) === "/") {
                path += index;
            }
            if (path.length > 1) {
                var resource = base.getResource(path);
                if (resource && resource.exists()) {
                    return Response.static(resource, mimeType(path, "text/plain"));
                }
            }
            return app(request);
        }
    }
};
