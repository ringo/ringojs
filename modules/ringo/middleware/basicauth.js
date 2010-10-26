/**
 * @fileOverview Basic Authentication middleware. To apply authentication to parts of your
 * website add this to your list of middlewares and pass the middleware function an object
 * like this with the long string being a SHA1 digest of the user's password:
 *
 *     var authConfig = {
 *         '/protected/path': {
 *             admin: "30b93f320076de1304c34673f9f524f7ea7db709"
 *         }
 *     };
 *     middleware = [
 *         require('ringo/middleware/basicauth').middleware(authConfig),
 *     ];
 */

var strings = require('ringo/utils/strings');
var base64 = require('ringo/base64');

exports.middleware = function(config) {
    return function (app) {
        return function (req) {
            // normalize multiple slashes in request path
            var path = (req.scriptName + req.pathInfo).replace(/\/+/g, '/');
            var toAuth;
            for (var realm in config) {
                if (path.indexOf(realm) == 0) {
                    toAuth = config[realm];
                    break;
                }
            }
            if (toAuth) {
                if (req.headers.authorization) { // Extract credentials from HTTP.
                    var credentials = base64.decode(req.headers.authorization
                            .replace(/Basic /, '')).split(':');
                    if (strings.digest(credentials[1], 'sha1') === toAuth[credentials[0]]) {
                        return app(req); // Authorization.
                    }
                }
                var msg = '401 Unauthorized';
                return { // Access denied.
                    status: 401,
                    headers: {
                        'Content-Type': 'text/html',
                        'WWW-Authenticate': 'Basic realm="Secure Area"'
                    },
                    body: [
                        '<html><head><title>', msg, '</title></head>',
                        '<body><h1>', msg, '</h1>',
                        '</body></html>'
                    ]
                };
            }
            return app(req);
        }
    }
};
