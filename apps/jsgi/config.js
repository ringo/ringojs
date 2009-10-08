// use some middleware if you like.
// this is automatically wrapped around your app by helma/jsgi.
/* exports.middleware = [
    'helma/middleware/gzip',
    'helma/middleware/etag'
]; */

// your actual JSGI app
exports.app = function(env) {
    return {
        status: 200,
        headers: {"Content-Type": "text/plain"},
        body: ["Hello World!"]
    }
}
