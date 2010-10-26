/**
 * @fileOverview Middleware for serving static resources.
 */

var {Response} = require("ringo/webapp/response");
var {mimeType} = require("ringo/webapp/mime");

/**
 * Middleware for serving static resources.
 * @param resourceBase the base resource directory
 */
exports.middleware = function(resourceBase) {
    if (typeof resourceBase == "string") {
        resourceBase = getRepository(resourceBase);
    }
    resourceBase.setRoot();
    return function(app) {
        return function(request) {
            var path = request.pathInfo;
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
