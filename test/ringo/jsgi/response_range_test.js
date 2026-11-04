require("ringo/logging").setConfig(getResource("../../log4j2.properties"));

const assert = require("assert");
const fs = require("fs");
const {MemoryStream} = require("io");
const {HttpServer} = require("ringo/httpserver");
const httpClient = require("ringo/httpclient");
const response = require("ringo/jsgi/response");

const DATA = new ByteString("Hello World! I am a string. A long string.", "ASCII");

let server = null;

exports.tearDown = function() {
    server.stop();
    server.destroy();
    server = null;
};

exports.testSimpleRange = function() {
    server = new HttpServer();
    server.serveApplication("/", function(request) {
        return response.range(request, new MemoryStream(DATA), DATA.length, "text/plain");
    });
    server.createHttpListener({
        "host": "localhost",
        "port": 8484,
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
    server = new HttpServer();
    server.serveApplication("/", function(request) {
        return response.range(request, new MemoryStream(DATA.concat(DATA, DATA, DATA)), 4 * DATA.length, "text/plain");
    });
    server.createHttpListener({
        "host": "localhost",
        "port": 8484,
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
    server = new HttpServer();
    server.serveApplication("/", function(request) {
        return response.range(request, new MemoryStream(DATA), DATA.length, "text/plain");
    });
    server.createHttpListener({
        "host": "localhost",
        "port": 8484,
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

exports.testFileStreamHandling = function() {
    const {openRaw} = fs;
    const opened = [];
    // spy on the streams response.range opens, restored at the end of the test
    fs.openRaw = function() {
        const stream = openRaw.apply(this, arguments);
        opened.push(stream);
        return stream;
    };

    server = new HttpServer();
    server.serveApplication("/", function(request) {
        return response.range(request, module.path, null, "text/plain");
    });
    server.createHttpListener({
        "host": "localhost",
        "port": 8484,
    });
    server.start();

    const statusFor = function(range) {
        return httpClient.request({
            method: "GET",
            url: "http://localhost:8484",
            headers: {
                "Range": range
            }
        }).status;
    };

    try {
        // rejected requests must not open the file at all
        assert.strictEqual(statusFor("wtf=0-1"), 416);
        assert.strictEqual(statusFor("bytes=99999999-99999999"), 416);
        assert.strictEqual(opened.length, 0);

        assert.strictEqual(statusFor("bytes=0-4"), 206);
        assert.strictEqual(opened.length, 1);
        assert.isTrue(opened[0].closed());
    } finally {
        fs.openRaw = openRaw;
    }
};

if (require.main === module) {
    require("system").exit(require("test").run(exports));
}
