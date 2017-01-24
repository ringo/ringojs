const assert = require("assert");
const {MemoryStream} = require("io");
const {Server} = require("ringo/httpserver");
const httpClient = require("ringo/httpclient");
const strings = require("ringo/utils/strings");
const response = require("ringo/jsgi/response");

const DATA = new ByteString("Hello World! I am a string. A long string.", "ASCII");

require("ringo/logging").setConfig(getResource("../httptest_log4j.properties"));
var server = null;

exports.setUp = function() {
};

exports.tearDown = function() {
    server.stop();
    server.destroy();
    server = null;
};

exports.testSimpleRange = function() {
    server = new Server({
        "host": "localhost",
        "port": 8484,
        "app": function(request) {
            const res = response.range(request, new MemoryStream(DATA), DATA.length, "text/plain");
            return res;
        }
    });
    server.start();
    let exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=0-4"
        }
    });
    assert.strictEqual(exchange.content, "Hello");
    assert.strictEqual(exchange.status, 206);

    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=0-4,6-10,-1"
        }
    });
    assert.strictEqual(exchange.content, "--THIS_STRING_SEPARATES\r\nContent-Type: text/plain\r\nContent-Range: bytes 0-4/42" +
        "\r\n\r\nHello\r\n--THIS_STRING_SEPARATES\r\nContent-Type: text/plain\r\nContent-Range: bytes 6-10/42\r\n\r\nWorld\r\n" +
        "--THIS_STRING_SEPARATES\r\nContent-Type: text/plain\r\nContent-Range: bytes 41-41/42\r\n\r\n.\r\n--THIS_STRING_SEPARATES--");
    assert.strictEqual(exchange.status, 206);
};

if (require.main === module) {
    require("system").exit(require("test").run(exports));
}
