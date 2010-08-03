// use some middleware if you like.
// this is automatically wrapped around your app by ringo/jsgi.
/* exports.middleware = [
    require('ringo/middleware/gzip').middleware,
    require('ringo/middleware/etag').middleware,
    require('ringo/middleware/error').middleware,
    require('ringo/middleware/notfound').middleware
]; */

// your actual JSGI app
exports.app = function(env) {
    return {
        status: 200,
        headers: {"Content-Type": "text/plain"},
        body: ["Hello World!"]
    }
};
