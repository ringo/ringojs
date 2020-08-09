var assert = require("assert");
var {AsyncResponse} = require("ringo/jsgi/connector");
var {HttpServer} = require("ringo/httpserver");
var httpClient = require("ringo/httpclient");
var strings = require("ringo/utils/strings");

require('ringo/logging').setConfig(getResource('../httptest_log4j2.properties'));
var server = null;

exports.setUp = function() {
};

exports.tearDown = function() {
    server.stop();
    server.destroy();
    server = null;
};

exports.testAsync = function() {
    var line = "test\n";

    server = new HttpServer();
    server.serveApplication("/", function(request) {
        var response = new AsyncResponse(request, 2000);
        response.start(200, {"Content-Type": "text/plain"});
        spawn(function() {
            var max = 5;
            for (let cnt = 0; cnt < max; cnt += 1) {
                try {
                    response.write(line);
                } catch (e) {
                    print(e);
                }
            }
            java.lang.Thread.sleep(Math.floor(Math.random() * 300));
            response.close();
        });
        return response;
    });
    server.createHttpListener({
        host: "localhost",
        port: 8282
    });
    server.start();

    var exchange = httpClient.get("http://localhost:8282");
    assert.strictEqual(exchange.status, 200);
    assert.strictEqual(exchange.content, strings.repeat(line, 5));
};
