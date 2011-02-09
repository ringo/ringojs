// The JSGI application
exports.app = function(request) {
    return {
        status: 200,
        headers: {},
        body: ["hello world"]
    }
}
