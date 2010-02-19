// use some middleware if you like.
// this is automatically wrapped around your app by ringo/jsgi.
/* exports.middleware = [
    'ringo/middleware/gzip',
    'ringo/middleware/etag'
]; */

// your actual JSGI app
exports.app = function(env) {
    return {
        status: 200,
        headers: {"Content-Type": "text/plain"},
        body: ["Hello World!"]
    }
}
