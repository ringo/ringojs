/**
 * @fileOverview Middleware for serving static resources.
 */

var {Response} = require("ringo/webapp/response");
var {mimeType} = require("ringo/webapp/mime");

/**
 * Middleware for serving static resources.
 *
 * #### Configuration options
 *
 *  The `options` object may contain the following properties:
 *
 *  - `index`: the name of a file to serve if the path matches a directory (e.g.
 *    "index.html")
 *
 * @param resourceBase the base resource directory
 * @param options optional configuration properties
 */
exports.middleware = function(resourceBase, options) {
    if (typeof resourceBase == "string") {
        resourceBase = getRepository(resourceBase);
    }
    resourceBase.setRoot();
    var index = options && options.index;
    return function(app) {
        return function(request) {
            var path = request.pathInfo;
            if (index && path.charAt(path.length-1) === "/") {
                path += index;
            }
            if (path.length > 1) {
                var resource = resourceBase.getResource(path);
                if (resource && resource.exists()) {
                    return Response.static(resource, mimeType(path, "text/plain"));
                }
            }
            return app(request);
        }
    }
};
