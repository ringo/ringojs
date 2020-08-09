var assert = require("assert");
var objects = require("ringo/utils/objects");
var {HttpServer} = require("ringo/httpserver");
var response = require("ringo/jsgi/response");
var {request, post, get, put, del, TextPart, BinaryPart} = require("ringo/httpclient");
var {parseParameters, parseFileUpload, setCookie, Headers} = require("ringo/utils/http");
var {MemoryStream, TextStream} = require("io");
var fs = require("fs");
var base64 = require("ringo/base64");
var {ByteArray, ByteString} = require("binary");
var {ByteArrayOutputStream} = java.io;
var {GZIPOutputStream, DeflaterOutputStream} = java.util.zip;

var server;
var host = "127.0.0.1";
var port = "8282";
var baseUri = "http://" + host + ":" + port + "/";

require('ringo/logging').setConfig(getResource('./httptest_log4j2.properties'));

/**
 * tests overwrite getResponse() to control the response they expect back
 */
var getResponse;

/**
 * setUp pre every test
 */
exports.setUp = function() {
    var handleRequest = function(req) {
        req.charset = 'utf8';
        req.pathInfo = decodeURI(req.pathInfo);
        return getResponse(req);
    };

    var config = {
        host: host,
        port: port
    };

    server = new HttpServer();
    server.serveApplication("/", handleRequest);
    server.createHttpListener(config);
    server.start();
    // test used to hang without this, but seems no longer the case
    // java.lang.Thread.currentThread().sleep(1000);
};

/**
 * tearDown after each test
 */
exports.tearDown = function() {
    server.stop();
    server.destroy();
    server = null;
};

/**
 * test basic get
 */
exports.testBasic = function() {
    const text = "This is the Response Text";

    getResponse = function(req) {
        return response.html(text + " - " + req.headers["user-agent"]);
    };

    var exchange = request({
        url: baseUri
    });

    assert.strictEqual(exchange.content, text + " - " + "RingoJS HttpClient " + require("ringo/engine").version.join("."));
};

exports.testNullContent = function() {
    getResponse = function(req) {
        return response.notFound();
    };

    var exchange = request({
        url: baseUri
    });

    assert.isNull(exchange.content);
};

/**
 * test user info in url
 */
exports.testUserInfo = function() {

    var log;
    getResponse = function(req) {
        log.push(req.headers["authorization"]);
        return response.html("response text");
    };

    // username and password in url
    log = [];
    request({url: "http://user:pass@" + host + ":" + port + "/"});
    assert.equal(log.length, 1, "user:pass - one request");
    assert.equal(typeof log[0], "string", "user:pass - one Authorization header");
    assert.equal(log[0].slice(0, 5), "Basic", "user:pass - Basic auth header");

    // username only in url, password in options
    log = [];
    request({url: "http://user@" + host + ":" + port + "/", password: "pass"});
    assert.equal(log.length, 1, "user - one request");
    assert.equal(typeof log[0], "string", "user - one Authorization header");
    assert.equal(log[0].slice(0, 5), "Basic", "user - Basic auth header");

    // username and password in url, options take precedence
    log = [];
    request({url: "http://user:pass@" + host + ":" + port + "/", username: "realuser", password: "realpass"});
    assert.equal(log.length, 1, "precedence - one request");
    assert.equal(typeof log[0], "string", "precedence - one Authorization header");
    assert.equal(log[0], "Basic " + base64.encode("realuser:realpass"), "precedence - Basic auth header");
};

/**
 * test servlet on request env (this is not httpclient specific, but uses same setUp tearDown)
 */
exports.testServlet = function() {
    var servlet;
    getResponse = function(req) {
        servlet = req.env.servlet;
        return response.html("servlet set");
    };

    var exchange = request({
        url: baseUri
    });
    assert.strictEqual(exchange.content, "servlet set");
    assert.ok(servlet instanceof javax.servlet.http.HttpServlet, "servlet instance");
};

/**
 * convenience wrappers
 */
exports.testConvenience = function() {
    getResponse = function(req) {
        var params = {};
        var input = req.method == "POST" ? req.input.read() : req.queryString;
        parseParameters(input, params);
        if (params.foo) {
            return response.html(req.method + " with param");
        }
        return response.html(req.method);
    };
    var x = post(baseUri);
    assert.strictEqual(x.status, 200);
    assert.strictEqual(x.content, "POST");

    x = post(baseUri, {foo: 'bar'});
    assert.strictEqual(x.status, 200);
    assert.strictEqual(x.content, "POST with param");

    x = get(baseUri, {foo: 'bar'});
    assert.strictEqual(x.status, 200);
    assert.strictEqual(x.content, "GET with param");

    x = del(baseUri);
    assert.strictEqual(x.status, 200);
    assert.strictEqual(x.content, "DELETE");

    x = put(baseUri);
    assert.strictEqual(x.status, 200);
    assert.strictEqual(x.content, "PUT");
};

/**
 * GET, POST params
 */
exports.testParams = function() {
    getResponse = function(req) {
        var params = {};
        var input = req.method == "POST" ? req.input.read() : req.queryString;
        parseParameters(input, params);
        return response.json(params);
    };
    var data = {
        a: "fääßß",
        b: "fööööbääzz",
        c: "08083",
        d: "0x0004"
    };
    var getExchange = request({
        url: baseUri,
        method: 'GET',
        data: data
    });
    assert.strictEqual(getExchange.status, 200);
    assert.deepEqual(JSON.parse(getExchange.content), data);

    var postExchange = request({
        url: baseUri,
        method: 'POST',
        data: data
    });
    assert.strictEqual(postExchange.status, 200);
    assert.deepEqual(JSON.parse(postExchange.content), data);
};

/**
 * Status Codes
 */
exports.testStatusCodes = function() {
    getResponse = function(req) {
        if (req.pathInfo == '/notfound') {
            return response.notFound().text("not found");
        } else if (req.pathInfo == '/success') {
            return response.json('success');
        } else if (req.pathInfo == '/redirect') {
            return {
                status: 302,
                headers: {Location: '/redirectlocation'},
                body: ["Found: " + '/redirectlocation']
            };
        } else if (req.pathInfo == '/redirectlocation') {
            return response.html('redirect success');
        }
    };

    var exchange = request({
        url: baseUri + 'notfound',
        method: 'GET'
    });
    assert.strictEqual(exchange.status, 404);
    assert.strictEqual(exchange.content, "not found");

    exchange = request({
        url: baseUri + 'success',
        method: 'GET'
    });
    assert.strictEqual(exchange.contentType, 'application/json;charset=utf-8');
    assert.strictEqual(exchange.status, 200);

    exchange = request({
        url: baseUri + 'redirect',
        method: 'GET',
        complete: function(hasError, exchange, message, ex) {
            complete = hasError === true;
        }
    });
    assert.strictEqual(exchange.status, 200);
};

/**
 * Cookie set and read
 */
exports.testCookie = function() {
    var COOKIE_NAME = "testcookie";
    var COOKIE_VALUE = "cookie value with s p   a c es";
    var COOKIE_DAYS = 5;

    getResponse = function(req) {
        var params = {};
        parseParameters(req.queryString, params);
        // set cookie
        var res = response.html("cookie set");
        res.headers["Set-Cookie"] = setCookie(COOKIE_NAME,
                params.cookievalue, COOKIE_DAYS, {
                    "domain": "localhost",
                    "secure": true
                });
        return res;
    };

    // receive cookie
    var exchange = request({
        url: baseUri,
        method: "GET",
        data: {
            "cookievalue": COOKIE_VALUE
        }
    });
    assert.strictEqual(exchange.status, 200);
    var cookie = exchange.cookies[COOKIE_NAME];
    assert.strictEqual(cookie.value, COOKIE_VALUE);
    // FIXME: why is -1 necessary?
    assert.strictEqual(cookie.maxAge, (5 * 24 * 60 * 60) - 1);
    assert.strictEqual(cookie.domain, "localhost");
    assert.strictEqual(cookie.isSecure, true);
};

/**
 * send stream and get the same stream back
 */
exports.testStreamRequest = function() {

    getResponse = function(req) {
        var input;
        return {
            status: 200,
            headers: {
                'Content-Type': 'image/png'
            },
            body: {
                forEach: function(fn) {
                    var read, bufsize = 8192;
                    var buffer = new ByteArray(bufsize);
                    input = req.input;
                    while ((read = input.readInto(buffer)) > -1) {
                        buffer.length = read;
                        fn(buffer);
                        buffer.length = bufsize;
                    }
                },
                close: function() {
                    if (input) {
                        input.close();
                    }
                }
            }
        };
    };

    var resource = getResource('./upload_test.png');
    var ByteArray = require('binary').ByteArray;
    var inputStream = resource.getInputStream();
    // small <1k file, just read it all in
    var size = resource.getLength();
    var inputByteArray = new ByteArray(size);
    inputStream.read(inputByteArray, 0, size);
    var sendInputStream = resource.getInputStream();

    var exchange = request({
        url: baseUri,
        method: 'POST',
        data: sendInputStream
    });
    assert.isNotNull(exchange);
    assert.strictEqual(exchange.contentBytes.length, inputByteArray.length);
    assert.deepEqual(exchange.contentBytes.toArray(), inputByteArray.toArray());
    assert.strictEqual(exchange.contentType, "image/png");
};

exports.testContentDecoding = function() {
    var unzipped = "abcdefghijklmnop";

    var compress = function(CompressorOutputStream) {
        var bos = new ByteArrayOutputStream();
        var cos = new CompressorOutputStream(bos, true);
        cos.write(unzipped.toByteArray());
        cos.finish();
        var bytes = ByteArray.wrap(bos.toByteArray());
        cos.close();
        return bytes;
    };

    var compressions = [
        {
            encodings: ['deflate', 'dEfLaTe'],
            CompressorOutputStream: DeflaterOutputStream
        },
        {
            encodings: ['gzip', 'gZiP'],
            CompressorOutputStream: GZIPOutputStream
        }
    ];

    for each (let {encodings, CompressorOutputStream} in compressions) {
        let compressed = compress(CompressorOutputStream);
        for each (let encoding in encodings) {
            getResponse = function(req) {
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'image/png',
                        'Content-Encoding': encoding
                    },
                    body: {
                        forEach: function(fn) {
                            return fn(compressed);
                        }
                    }
                };
            };

            let exchange = request({
                url: baseUri,
                method: 'GET'
            });
            assert.isNotNull(exchange, 'Content-Encoding: ' + encoding);
            assert.strictEqual(exchange.content, unzipped, 'Content-Encoding: ' + encoding);
        }
    }
};

exports.testPost = function() {

    getResponse = function(req) {
        var input;
        return {
            "status": 200,
            "headers": {
                "Content-Type": "application/octet-stream"
            },
            "body": {
                forEach: function(fn) {
                    var read, bufsize = 8192;
                    var buffer = new ByteArray(bufsize);
                    input = req.input;
                    while ((read = input.readInto(buffer)) > -1) {
                        buffer.length = read;
                        fn(buffer);
                        buffer.length = bufsize;
                    }
                },
                close: function() {
                    if (input) {
                        input.close();
                    }
                }
            }
        };
    };

    // use this module's source as test data
    var data = fs.read(module.path);
    var inputByteArray = data.toByteArray();

    // POSTing byte array
    var exchange = request({
        url: baseUri,
        method: "POST",
        data: inputByteArray
    });
    assert.strictEqual(exchange.status, 200);
    assert.strictEqual(exchange.contentBytes.length, inputByteArray.length);
    assert.deepEqual(exchange.contentBytes.toArray(), inputByteArray.toArray());

    // POSTing memory stream
    exchange = request({
        url: baseUri,
        method: "POST",
        data: new MemoryStream(inputByteArray)
    });
    assert.strictEqual(exchange.status, 200);
    assert.strictEqual(exchange.contentBytes.length, inputByteArray.length);
    assert.deepEqual(exchange.contentBytes.toArray(), inputByteArray.toArray());

    // POSTing text stream
    exchange = request({
        url: baseUri,
        method: "POST",
        data: new TextStream(new MemoryStream(data.toByteString()), {charset: "utf-8"})
    });
    assert.strictEqual(exchange.status, 200);
    assert.strictEqual(exchange.contentBytes.length, inputByteArray.length);
    assert.deepEqual(exchange.contentBytes.toArray(), inputByteArray.toArray());

    // POSTing java.io.InputStream
    exchange = request({
        url: baseUri,
        method: "POST",
        data: fs.openRaw(module.path).unwrap()
    });
    assert.strictEqual(exchange.status, 200);
    assert.strictEqual(exchange.contentBytes.length, inputByteArray.length);
    assert.deepEqual(exchange.contentBytes.toArray(), inputByteArray.toArray());

    var resource = getResource('./upload_test.png');
    var inputStream = resource.getInputStream();
    // small <1k file, just read it all in
    var size = resource.getLength();
    inputByteArray = new ByteArray(size);
    inputStream.read(inputByteArray, 0, size);
    exchange = request({
        url: baseUri,
        method: "POST",
        data: resource.getInputStream()
    });
    assert.strictEqual(inputByteArray.length, exchange.contentBytes.length);
    assert.deepEqual(inputByteArray.toArray(), exchange.contentBytes.toArray());
};

exports.testPostMultipart = function() {

    var textFile = module.resolve("text_test.txt");
    var imageFile = module.resolve("upload_test.png");
    var received = {};

    getResponse = function(req) {
        var encoding = req.env.servletRequest.getCharacterEncoding() || "utf8";
        var params = parseFileUpload(req, {}, encoding);
        for (let [key, value] in Iterator(params)) {
            received[key] = value;
        }
        return response.html("OK");
    };

    var title = "testing multipart post";
    var textStream = fs.open(textFile, {"read": true, "charset": "utf-8"});
    var textFileStream = fs.open(textFile, {"read": true, "charset": "utf-8"});
    var binaryStream = fs.open(imageFile, {"read": true, "binary": true});

    var inputStream = fs.open(imageFile, {"read": true, "binary": true});
    // small <1k file, just read it all in
    var size = fs.size(imageFile);
    var imageByteArray = new ByteArray(size);
    inputStream.readInto(imageByteArray, 0, size);

    var exchange = request({
        url: baseUri,
        method: "POST",
        contentType: "multipart/form-data",
        data: {
            "title": new TextPart(title, "utf-8"),
            "text": new TextPart(textStream, "utf-8"),
            "textfile": new TextPart(textFileStream, "utf-8", fs.base(textFile)),
            "image": new BinaryPart(binaryStream, "image.png")
        }
    });
    assert.strictEqual(exchange.status, 200);
    assert.strictEqual(received.title, title);
    // normalize line feeds, otherwise test fails on windows
    var expectedText = fs.read(textFile).replace(/\r\n/g, "\n");
    assert.strictEqual(received.text, expectedText);
    assert.isNotUndefined(received.textfile);
    assert.strictEqual(received.textfile.filename, fs.base(textFile));
    assert.strictEqual(received.textfile.value.decodeToString(), expectedText);
    assert.isNotUndefined(received.image);
    assert.strictEqual(received.image.value.length, imageByteArray.length);
    assert.deepEqual(received.image.value.toArray(), imageByteArray.toArray());

    // invalid request
    assert.throws(function() {
        request({
            url: baseUri,
            method: "POST",
            contentType: "multipart/form-data",
            data: {
                "invalid": "Invalid"
            }
        });
    }, Error);
};

exports.testProxiedRequest = function() {
    var text = "<h1>This is the Response Text</h1>";

    getResponse = function(req) {
        return response.html(text);
    };

    var exchange = request({
        url: "http://idontexistandifigetcalledwithoutproxyshouldraiseerror.com",
        proxy: [host, ":", port].join(""),
    });
    assert.strictEqual(exchange.content, text);

    exchange = request({
        url: "http://idontexistandifigetcalledwithoutproxyshouldraiseerror.com",
        proxy: {"host": host, "port": port}
    });
    assert.strictEqual(exchange.content, text);
};

exports.testIterateExchange_Issue287 = function() {
    //exchange.headers
    var text = "<h1>This is the Response Text</h1>";

    getResponse = function(req) {
        return response.html(text);
    };

    var errorCalled, myData;
    var exchange = request({
        url: baseUri
    });
    assert.strictEqual(exchange.content, text);

    var clone = objects.clone(exchange.headers, false, 0);
    assert.deepEqual(exchange.headers, clone);
    assert.isUndefined(exchange.headers[null]);
};

exports.testTimeoutResponse_Issue267 = function() {
    getResponse = function(req) {
        var loops = 0;
        var started = Date.now();
        while (Date.now() - started < 100) {
            loops++;
        }
        return response.text("did " + loops + " loops in " + (Date.now() - started) + " milliseconds.");
    };

    assert.throws(function() {
        var exchange = request({
            readTimeout: 1,
            url: baseUri
        });
        assert.fail("This should not be reachable!");
    }, java.net.SocketTimeoutException, "A timeout request should throw an exception!");
};

exports.testNoCallbacks = function() {
    getResponse = function(req) {
        return response.text("foo");
    };

    var anyCallbackCalled = false;
    var exchange = request({
        "url": baseUri,
        "success": function() {
            anyCallbackCalled = true;
        },
        "complete": function() {
            anyCallbackCalled = true;
        },
        "error": function() {
            anyCallbackCalled = true;
        }
    });

    assert.isFalse(anyCallbackCalled, "Callback has been called!");
    assert.strictEqual(exchange.status, 200);
};

exports.testMultipleHeaders_Issue225 = function() {
    getResponse = function(req) {
        assert.equal(req.env.servletRequest.getHeader("single-header"), "one", "Header not present");
        assert.equal(req.env.servletRequest.getHeader("multiple-header"), "one,two", "Multiple headers not merged into one");
        return response.text("done");
    };

    let preparedHeaders = Headers({});
    preparedHeaders.set("single-header", "one");
    preparedHeaders.add("multiple-header", "one");
    preparedHeaders.add("multiple-header", "two");

    var exchange = request({
        url: baseUri,
        headers: preparedHeaders
    });
};

exports.testStreamResponse = function() {
    getResponse = function(req) {
        var bs = new MemoryStream(3);
        bs.write(new ByteString("\t\r\n", "ASCII"));
        bs.position = 0;
        return response.stream(bs);
    };

    var exchange = request({
        url: baseUri
    });

    assert.strictEqual(exchange.content, "\t\r\n");
};

exports.testBinaryResponse = function() {
    getResponse = function(req) {
        return response.binary(new ByteArray([35, 114, 105, 110, 103, 111, 106, 115]));
    };

    var exchange = request({
        url: baseUri,
        binary: true
    });

    assert.strictEqual(exchange.contentBytes.toArray().join(""), [35, 114, 105, 110, 103, 111, 106, 115].join(""));
};

exports.testBinaryPart = function() {
    let bin, result;
    let sw = new java.io.StringWriter();
    let bos = new java.io.ByteArrayOutputStream();

    try {
        bin = new BinaryPart(fs.openRaw(module.resolve("./text_test.txt"), "r"), "foo.txt", "text/superplain");
        bin.write("testname.txt", sw, bos);

        result = sw.toString().split("\r\n");
        assert.equal(result[0], "Content-Disposition: form-data; name=\"testname.txt\"; filename=\"foo.txt\"");
        assert.equal(result[1], "Content-Type: text/superplain");
        assert.equal(result[2], "Content-Transfer-Encoding: binary");
    } finally {
        sw.close();
        bos.close();
    }

    try {
        bin = new BinaryPart(fs.openRaw(module.resolve("./text_test.txt"), "r"), "bar.txt");
        sw = new java.io.StringWriter();
        bos = new java.io.ByteArrayOutputStream();
        bin.write("paramname", sw, bos);

        result = sw.toString().split("\r\n");
        assert.equal(result[0], "Content-Disposition: form-data; name=\"paramname\"; filename=\"bar.txt\"");
        assert.equal(result[1], "Content-Type: text/plain");
        assert.equal(result[2], "Content-Transfer-Encoding: binary");
    } finally {
        sw.close();
        bos.close();
    }
};

exports.testTextPart = function() {
    let tp, result;
    let sw = new java.io.StringWriter();
    let bos = new java.io.ByteArrayOutputStream();

    try {
        tp = new TextPart("asdfasdfasdf", "ISO-8859-15", "foo.txt");
        tp.write("paramname", sw, bos);

        result = sw.toString().split("\r\n");
        assert.equal(result[0], "Content-Disposition: form-data; name=\"paramname\"; filename=\"foo.txt\"");
        assert.equal(result[1], "Content-Type: text/plain; charset=ISO-8859-15");
    } finally {
        sw.close();
        bos.close();
    }

    let stream = fs.open(module.resolve("./text_test.txt"));
    let mem = new MemoryStream(1000);
    sw = new java.io.StringWriter();

    try {
        tp = new TextPart(stream, "ISO-8859-15", "foo.txt");
        tp.write("paramname", sw, mem);

        result = sw.toString().split("\r\n");
        assert.equal(result[0], "Content-Disposition: form-data; name=\"paramname\"; filename=\"foo.txt\"");
        assert.equal(result[1], "Content-Type: text/plain; charset=ISO-8859-15");
    } finally {
        sw.close();
        mem.close();
        stream.close();
    }

    stream = fs.open(module.resolve("./text_test.txt"));
    mem = new MemoryStream(1000);
    sw = new java.io.StringWriter();

    try {
        tp = new TextPart(stream);
        tp.write("paramname", sw, mem);

        result = sw.toString().split("\r\n");
        assert.equal(result[0], "Content-Disposition: form-data; name=\"paramname\"");
        assert.equal(result[1], "Content-Type: text/plain; charset=utf-8");
    } finally {
        sw.close();
        mem.close();
        stream.close();
    }
};

// start the test runner if we're called directly from command line
if (require.main === module) {
    var {run} = require("test");
    var system = require("system");
    if (system.args.length > 1) {
        system.exit(run(exports, system.args.pop()));
    }
    system.exit(run(exports));
}
