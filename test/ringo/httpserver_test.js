var assert = require("assert");

var {Server} = require("ringo/httpserver");
var response = require("ringo/jsgi/response");
var {request} = require("ringo/httpclient");

require('ringo/logging').setConfig(getResource('./httptest_log4j.properties'));

// Basic test configuration
var server;
var host = "127.0.0.1";
var port = "8282";
var baseUri = "http://" + host + ":" + port + "/";

/**
 * tests overwrite checkRequest() to control the 
 */
var checkRequest = function(req) { return; };

// HTTP client callbacks
var success = function() {};
var error = function() { assert.fail("Error callback invoked by client."); };

/**
 * setUp pre every test
 */
exports.setUp = function() {
    var config = {
        host: host,
        port: port
    };

    server = new Server(config);
    server.getDefaultContext().serveApplication(function(req) {
        // this performs the actual test
        checkRequest(req);
        return response.html("");
    });
    server.start();
};

/**
 * tearDown after each test
 */
exports.tearDown = function() {
    server.stop();
    server.destroy();
    server = null;
    checkRequest = null;
};

exports.testGetRequest = function () {
    checkRequest = function(req) {
        assert.equal(req.method, "GET");
        assert.equal(req.scheme, "http");
        assert.equal(req.queryString, "a=b");

        assert.equal(req.headers.host, host + ":" + port); // This follows RFC 2616!
        assert.equal(req.headers.foo, "bar");
        assert.equal(req.headers["x-foo"], "x-bar");
        assert.equal(req.headers.one, "2");
        assert.equal(req.headers.authorization, "Basic YWRtaW46c2VjcmV0");
    };

    request({
        url: baseUri + "?a=b#notvisible",
        method: "GET",
        headers: {
            "foo": "bar",
            "x-foo": "x-bar",
            "one": 2
        },
        username: "admin",
        password: "secret",
        contentType: "text/plain",
        success: success,
        error: error
    });
};

exports.testPostRequest = function () {
    checkRequest = function(req) {
        assert.equal(req.method, "POST");
        assert.equal(req.scheme, "http");
        assert.equal(req.queryString, "");

        assert.equal(req.headers.host, host + ":" + port); // This follows RFC 2616!
        assert.equal(req.headers.foo, "bar");
        assert.equal(req.headers.one, "2");
        assert.equal(req.headers["x-foo"], "x-bar");
        assert.equal(req.headers.authorization, "Basic YWRtaW46c2VjcmV0");
    };

    request({
        url: baseUri,
        method: "POST",
        headers: {
            "foo": "bar",
            "x-foo": "x-bar",
            "one": 2
        },
        data: {
            "param1": "value1",
            "param2": 2
        },
        username: "admin",
        password: "secret",
        success: success,
        error: error
    });
};

exports.testPutRequest = function () {
    checkRequest = function(req) {
        assert.equal(req.method, "PUT");
        assert.equal(req.scheme, "http");
        assert.equal(req.queryString, "");

        assert.equal(req.headers.host, host + ":" + port); // This follows RFC 2616!
        assert.equal(req.headers.foo, "bar");
        assert.equal(req.headers.one, "2");
        assert.equal(req.headers["x-foo"], "x-bar");
        assert.equal(req.headers.authorization, "Basic YWRtaW46c2VjcmV0");
    };

    request({
        url: baseUri,
        method: "PUT",
        headers: {
            "foo": "bar",
            "x-foo": "x-bar",
            "one": 2
        },
        data: {
            "param1": "value1",
            "param2": 2
        },
        username: "admin",
        password: "secret",
        success: success,
        error: error
    });
};

exports.testDeleteRequest = function () {
    checkRequest = function(req) {
        assert.equal(req.method, "DELETE");
        assert.equal(req.scheme, "http");
        assert.equal(req.queryString, "a=b");

        assert.equal(req.headers.host, host + ":" + port); // This follows RFC 2616!
        assert.equal(req.headers.foo, "bar");
        assert.equal(req.headers["x-foo"], "x-bar");
        assert.equal(req.headers.one, "2");
        assert.equal(req.headers.authorization, "Basic YWRtaW46c2VjcmV0");
    };

    request({
        url: baseUri + "?a=b#notvisible",
        method: "DELETE",
        headers: {
            "foo": "bar",
            "x-foo": "x-bar",
            "one": 2
        },
        username: "admin",
        password: "secret",
        contentType: "text/plain",
        success: success,
        error: error
    });
};

exports.testMultipleHeaders = function () {
    checkRequest = function(req) {
        assert.equal(req.method, "GET");
        assert.equal(req.scheme, "http");
        
        assert.equal(req.headers.host, host + ":" + port); // This follows RFC 2616!
        assert.equal(req.headers["x-foo"], "bar");
        
        var headersArray = [];
        for (var headers = req.env.servletRequest.getHeaders("x-foo"); headers.hasMoreElements(); ) {
            headersArray.push(headers.nextElement());
        }
        assert.equal("bar, baz, 012345;q=15", headersArray.join(", "));
    };

    var connection = (new java.net.URL(baseUri)).openConnection();
    connection.setRequestMethod("GET");

    // addRequestProperty() does not override existing header pairs!
    connection.addRequestProperty("x-foo", "bar");
    connection.addRequestProperty("x-foo", "baz");
    connection.addRequestProperty("x-foo", "012345;q=15");

    connection.addRequestProperty("x-foo-single", "single-bar");

    connection.connect();
    connection.getResponseCode();
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    var {run} = require("test");
    require("system").exit(run(exports));
}
