var assert = require("assert");
var {base} = require("fs");

var middleware = require("ringo/middleware/static").middleware;

function notFound(request) {
    return {
        status: 404,
        headers: {"Content-Type": "text/plain"},
        body: [request.pathInfo]
    };
}

var thisName = base(module.id) + ".js";

exports.testDefault = function() {

    var app = middleware(module.directory)(notFound);
    var resp;
    
    // request something that doesn't exist
    resp = app({pathInfo: "not-found"});
    assert.strictEqual(resp.status, 404, "first request not found");
    
    // request something that does exist
    resp = app({pathInfo: thisName});
    assert.strictEqual(resp.status, 200, "second request found");
    
};

exports.testIndexConfig = function() {

    var app = middleware({base: module.directory, index: thisName})(notFound);
    var resp;
    
    // request something that doesn't exist
    resp = app({pathInfo: "not-found"});
    assert.strictEqual(resp.status, 404, "first request not found");
    
    // request something that does exist
    resp = app({pathInfo: "/"});
    assert.strictEqual(resp.status, 200, "second request found");
    
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run(exports));
}

