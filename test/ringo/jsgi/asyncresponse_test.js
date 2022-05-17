require('ringo/logging').setConfig(getResource('../../log4j2.properties'));

const assert = require("assert");
const {AsyncResponse} = require("ringo/jsgi/connector");
const {HttpServer} = require("ringo/httpserver");
const httpClient = require("ringo/httpclient");
const strings = require("ringo/utils/strings");

let server = null;

exports.tearDown = function() {
    server.stop();
    server.destroy();
    server = null;
};

exports.testAsync = () => {
    const line = "test\n";

    server = new HttpServer();
    server.serveApplication("/", function(request) {
        const response = new AsyncResponse(request, 2000);
        response.start(200, {"Content-Type": "text/plain"});
        spawn(function() {
            const max = 5;
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

    const exchange = httpClient.get("http://localhost:8282");
    assert.strictEqual(exchange.status, 200);
    assert.strictEqual(exchange.content, strings.repeat(line, 5));
};
