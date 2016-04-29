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
        assert.equal(req.headers["x-foo-single"], "single-bar");
        assert.equal(req.headers["x-foo"], "bar,baz,012345;q=15");
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

exports.testServletEnvironment = function () {
    checkRequest = function(req) {
        assert.equal(req.method, "GET");
        assert.equal(req.scheme, "http");

        assert.isNotUndefined(req.env.servlet);
        assert.isNotUndefined(req.env.servletRequest);
        assert.isNotUndefined(req.env.servletResponse);

        assert.isTrue(typeof req.env.servlet.getServletConfig === "function");
        assert.isTrue(typeof req.env.servletRequest.getPathInfo === "function");
        assert.isTrue(typeof req.env.servletResponse.getStatus === "function");
    };

    var connection = (new java.net.URL(baseUri)).openConnection();
    connection.setRequestMethod("GET");

    // addRequestProperty() does not override existing header pairs!
    connection.connect();
    connection.getResponseCode();
};

exports.testOptions = function() {
    server.stop();
    var config = {
        host: host,
        port: port,
        sessions: false,
        security: false
    };
    server = new Server(config);
    server.start();
    var cx = server.getDefaultContext();
    assert.isNull(cx.getHandler().getSessionHandler());
    assert.isNull(cx.getHandler().getSecurityHandler());
    server.stop();
    // enable sessions
    config.sessions = true;
    config.security = true;
    server = new Server(config);
    server.start();
    cx = server.getDefaultContext();
    assert.isNotNull(cx.getHandler().getSecurityHandler());
    var sessionHandler = cx.getHandler().getSessionHandler();
    assert.isNotNull(sessionHandler);
    var sessionManager = sessionHandler.getSessionManager();
    assert.strictEqual(sessionManager.getSessionCookie(), "JSESSIONID");
    assert.strictEqual(sessionManager.getSessionDomain(), null);
    assert.strictEqual(sessionManager.getSessionPath(), null);
    assert.isFalse(sessionManager.getHttpOnly());
    assert.isFalse(sessionManager.getSecureCookies());
    server.stop();
    // configure session cookies
    config.cookieName = "ringosession";
    config.cookieDomain = ".example.com";
    config.cookiePath = "/test";
    config.httpOnlyCookies = true;
    config.secureCookies = true;
    server = new Server(config);
    server.start();
    cx = server.getDefaultContext();
    sessionManager = cx.getHandler().getSessionHandler().getSessionManager();
    assert.strictEqual(sessionManager.getSessionCookie(), config.cookieName);
    assert.strictEqual(sessionManager.getSessionDomain(), config.cookieDomain);
    assert.strictEqual(sessionManager.getSessionPath(), config.cookiePath);
    assert.isTrue(sessionManager.getHttpOnly());
    assert.isTrue(sessionManager.getSecureCookies());
};

// start the test runner if we're called directly from command line
if (require.main === module) {
    var {run} = require("test");
    require("system").exit(run(exports));
}
