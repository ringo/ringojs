const assert = require("assert");
const {MemoryStream} = require("io");
const {Server} = require("ringo/httpserver");
const httpClient = require("ringo/httpclient");
const strings = require("ringo/utils/strings");
const response = require("ringo/jsgi/response");

const DATA = new ByteString("Hello World! I am a string. A long string.", "ASCII");

require("ringo/logging").setConfig(getResource("../httptest_log4j2.properties"));
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
            return response.range(request, new MemoryStream(DATA), DATA.length, "text/plain");
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

    // mutiple ranges
    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=0-4,6-10,-1"
        }
    });

    let boundary = "--" + exchange.contentType.substr(exchange.contentType.indexOf("boundary=") + 9);
    assert.strictEqual(exchange.content, boundary + "\r\nContent-Type: text/plain\r\nContent-Range: bytes 0-4/42" +
        "\r\n\r\nHello\r\n" + boundary + "\r\nContent-Type: text/plain\r\nContent-Range: bytes 6-10/42\r\n\r\nWorld\r\n" +
        "" + boundary + "\r\nContent-Type: text/plain\r\nContent-Range: bytes 41-41/42\r\n\r\n.\r\n" + boundary + "--");
    assert.strictEqual(exchange.status, 206);

    // overlapping ranges should get merged
    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=0-1,0-3,0-1,0-4,3-4,-1,6-10,9-10,-1"
        }
    });
    boundary = "--" + exchange.contentType.substr(exchange.contentType.indexOf("boundary=") + 9);
    assert.strictEqual(exchange.content, "" + boundary + "\r\nContent-Type: text/plain\r\nContent-Range: bytes 0-4/42" +
        "\r\n\r\nHello\r\n" + boundary + "\r\nContent-Type: text/plain\r\nContent-Range: bytes 6-10/42\r\n\r\nWorld\r\n" +
        "" + boundary + "\r\nContent-Type: text/plain\r\nContent-Range: bytes 41-41/42\r\n\r\n.\r\n" + boundary + "--");
    assert.strictEqual(exchange.status, 206);
};

exports.testCombinedRequests = function() {
    server = new Server({
        "host": "localhost",
        "port": 8484,
        "app": function(request) {
            const res = response.range(request, new MemoryStream(DATA.concat(DATA, DATA, DATA)), 4 * DATA.length, "text/plain");
            return res;
        }
    });
    server.start();

    const blockEnd = DATA.length - 1;
    let exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=0-" + blockEnd
        }
    });
    assert.strictEqual(exchange.status, 206);
    assert.strictEqual(exchange.content, DATA.decodeToString("ASCII"));

    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=" + (blockEnd + 1) +"-" + ((2 * blockEnd) + 1)
        }
    });
    assert.strictEqual(exchange.status, 206);
    assert.strictEqual(exchange.content, DATA.decodeToString("ASCII"));

    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=" + (blockEnd + 1) +"-" + ((2 * blockEnd) - 4) + "," +
                ((2 * blockEnd) - 3) +"-" + ((2 * blockEnd) + 1)
        }
    });
    assert.strictEqual(exchange.status, 206);
    assert.strictEqual(exchange.content, DATA.decodeToString("ASCII"));

    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=-" + (2 * DATA.length) + ",0-" + (2 * DATA.length)
        }
    });
    assert.strictEqual(exchange.status, 206);
    assert.strictEqual(exchange.content, (DATA.concat(DATA, DATA, DATA)).decodeToString("ASCII"));
    assert.strictEqual(exchange.headers["Content-Range"].length, 1);
    assert.strictEqual(exchange.headers["Content-Range"][0], "bytes 0-" + ((4 * DATA.length) - 1) + "/" + (4 * DATA.length));
};

exports.testInvalidRanges = function() {
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
            "Range": "bytes=100-200"
        }
    });
    assert.strictEqual(exchange.status, 416);
    assert.deepEqual(exchange.headers["Content-Range"], ["bytes */" + DATA.length]);

    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=10-20,-2,100-200,5-6"
        }
    });
    assert.strictEqual(exchange.status, 416);
    assert.deepEqual(exchange.headers["Content-Range"], ["bytes */" + DATA.length]);

    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "wtf=10-20"
        }
    });
    assert.strictEqual(exchange.status, 416);

    exchange = httpClient.request({
        method: "GET",
        url: "http://localhost:8484",
        headers: {
            "Range": "bytes=-10-20"
        }
    });
    assert.strictEqual(exchange.status, 416);
};

if (require.main === module) {
    require("system").exit(require("test").run(exports));
}
