// The JSGI application
exports.app = function(request) {
    return {
        status: 200,
        headers: {"Content-Type": "text/plain"},
        body: ["hello world"]
    }
}
