const assert = require("assert");
const objects = require("ringo/utils/objects");
const system = require("system");
const {HttpServer} = require("ringo/httpserver");
const response = require("ringo/jsgi/response");
const {request, post, get, put, del, TextPart, BinaryPart} = require("ringo/httpclient");
const {parseParameters, parseFileUpload, setCookie, Headers} = require("ringo/utils/http");
const {MemoryStream, TextStream} = require("io");
const fs = require("fs");
const base64 = require("ringo/base64");
const binary = require("binary");
const {ByteArrayOutputStream, StringWriter} = java.io;
const {GZIPOutputStream, DeflaterOutputStream} = java.util.zip;
const {HttpServlet} = javax.servlet.http;

const host = "127.0.0.1";
const port = "8282";
const baseUri = "http://" + host + ":" + port + "/";
let server;

require('ringo/logging').setConfig(getResource('./httptest_log4j2.properties'));

/**
 * tests overwrite getResponse() to control the response they expect back
 */
let getResponse;

/**
 * setUp pre every test
 */
exports.setUp = () => {
    server = new HttpServer();
    server.serveApplication("/", (req) => {
        req.charset = 'utf8';
        req.pathInfo = decodeURI(req.pathInfo);
        return getResponse(req);
    });
    server.createHttpListener({
        host: host,
        port: port
    });
    server.start();
};

/**
 * tearDown after each test
 */
exports.tearDown = () => {
    server.stop();
    server.destroy();
    server = null;
};

/**
 * test basic get
 */
exports.testBasic = () => {
    const text = "This is the Response Text";

    getResponse = (req) => {
        return response.html(text + " - " + req.headers["user-agent"]);
    };

    const exchange = request({
        url: baseUri
    });

    assert.strictEqual(exchange.content, text + " - " + "RingoJS HttpClient " + require("ringo/engine").version.join("."));
};

exports.testNullContent = () => {
    getResponse = () => {
        return response.notFound();
    };

    const exchange = request({
        url: baseUri
    });

    assert.isNull(exchange.content);
};

/**
 * test user info in url
 */
exports.testUserInfo = () => {

    getResponse = (req) => {
        log.push(req.headers["authorization"]);
        return response.html("response text");
    };

    // username and password in url
    let log = [];
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
exports.testServlet = () => {
    let servlet;
    getResponse = (req) => {
        servlet = req.env.servlet;
        return response.html("servlet set");
    };

    const exchange = request({
        url: baseUri
    });
    assert.strictEqual(exchange.content, "servlet set");
    assert.ok(servlet instanceof HttpServlet, "servlet instance");
};

/**
 * convenience wrappers
 */
exports.testConvenience = () => {
    getResponse = (req) => {
        const params = {};
        const input = (req.method === "POST") ? req.input.read() : req.queryString;
        parseParameters(input, params);
        if (params.foo) {
            return response.html(req.method + " with param");
        }
        return response.html(req.method);
    };
    let x = post(baseUri);
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
exports.testParams = () => {
    getResponse = (req) => {
        const input = (req.method === "POST") ? req.input.read() : req.queryString;
        const params = parseParameters(input, {});
        return response.json(params);
    };
    const data = {
        a: "fääßß",
        b: "fööööbääzz",
        c: "08083",
        d: "0x0004"
    };
    const getExchange = request({
        url: baseUri,
        method: 'GET',
        data: data
    });
    assert.strictEqual(getExchange.status, 200);
    assert.deepEqual(JSON.parse(getExchange.content), data);

    const postExchange = request({
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
exports.testStatusCodes = () => {
    getResponse = (req) => {
        switch (req.pathInfo) {
            case "/notfound":
                return response.notFound().text("not found");
            case "/success":
                return response.json('success');
            case "/redirect":
                return {
                    status: 302,
                    headers: {Location: '/redirectlocation'},
                    body: ["Found: " + '/redirectlocation']
                };
            case "/redirectlocation":
                return response.html('redirect success');
            default:
                throw new Error("Unknown req.pathInfo '" + req.pathInfo + "'");
        }
    };

    let exchange = request({
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
    const COOKIE_NAME = "testcookie";
    const COOKIE_VALUE = "cookie value with s p   a c es";
    const COOKIE_DAYS = 5;

    getResponse = (req) => {
        const params = parseParameters(req.queryString, {});
        // set cookie
        const res = response.html("cookie set");
        res.headers["Set-Cookie"] = setCookie(COOKIE_NAME,
                params.cookievalue, COOKIE_DAYS, {
                    "domain": "localhost",
                    "secure": true
                });
        return res;
    };

    // receive cookie
    const exchange = request({
        url: baseUri,
        method: "GET",
        data: {
            "cookievalue": COOKIE_VALUE
        }
    });
    assert.strictEqual(exchange.status, 200);
    const cookie = exchange.cookies[COOKIE_NAME];
    assert.strictEqual(cookie.value, COOKIE_VALUE);
    // FIXME: why is -1 necessary?
    assert.strictEqual(cookie.maxAge, (5 * 24 * 60 * 60) - 1);
    assert.strictEqual(cookie.domain, "localhost");
    assert.strictEqual(cookie.isSecure, true);
};

/**
 * send stream and get the same stream back
 */
exports.testStreamRequest = () => {

    getResponse = (req) => {
        return {
            status: 200,
            headers: {
                'Content-Type': 'image/png'
            },
            body: {
                forEach: (fn) => {
                    const bufsize = 8192;
                    const buffer = new binary.ByteArray(bufsize);
                    let read;
                    while ((read = req.input.readInto(buffer)) > -1) {
                        buffer.length = read;
                        fn(buffer);
                        buffer.length = bufsize;
                    }
                },
                close: () => {
                    req.input && req.input.close();
                }
            }
        };
    };

    const resource = getResource('./upload_test.png');
    const inputStream = resource.getInputStream();
    // small <1k file, just read it all in
    const size = resource.getLength();
    const inputByteArray = new binary.ByteArray(size);
    inputStream.read(inputByteArray, 0, size);
    const sendInputStream = resource.getInputStream();

    const exchange = request({
        url: baseUri,
        method: 'POST',
        data: sendInputStream
    });
    assert.isNotNull(exchange);
    assert.strictEqual(exchange.contentBytes.length, inputByteArray.length);
    assert.deepEqual(exchange.contentBytes.toArray(), inputByteArray.toArray());
    assert.strictEqual(exchange.contentType, "image/png");
};

exports.testContentDecoding = () => {
    const unzipped = "abcdefghijklmnop";

    const compress = (CompressorOutputStream) => {
        const bos = new ByteArrayOutputStream();
        const cos = new CompressorOutputStream(bos, true);
        cos.write(unzipped.toByteArray());
        cos.finish();
        const bytes = binary.ByteArray.wrap(bos.toByteArray());
        cos.close();
        return bytes;
    };

    const compressions = [
        {
            encodings: ['deflate', 'dEfLaTe'],
            CompressorOutputStream: DeflaterOutputStream
        },
        {
            encodings: ['gzip', 'gZiP'],
            CompressorOutputStream: GZIPOutputStream
        }
    ];

    compressions.forEach(compression => {
        const {encodings, CompressorOutputStream} = compression;
        let compressed = compress(CompressorOutputStream);
        encodings.forEach(encoding => {
            getResponse = (req) => {
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'image/png',
                        'Content-Encoding': encoding
                    },
                    body: {
                        forEach: (fn) => fn(compressed)
                    }
                };
            };

            const exchange = request({
                url: baseUri,
                method: 'GET'
            });
            assert.isNotNull(exchange, 'Content-Encoding: ' + encoding);
            assert.strictEqual(exchange.content, unzipped, 'Content-Encoding: ' + encoding);
        });
    })
};

exports.testPost = () => {

    getResponse = (req) => {
        return {
            "status": 200,
            "headers": {
                "Content-Type": "application/octet-stream"
            },
            "body": {
                forEach: (fn) => {
                    const bufsize = 8192;
                    const buffer = new binary.ByteArray(bufsize);
                    let read;
                    while ((read = req.input.readInto(buffer)) > -1) {
                        buffer.length = read;
                        fn(buffer);
                        buffer.length = bufsize;
                    }
                },
                close: () => {
                    req.input && req.input.close();
                }
            }
        };
    };

    // use this module's source as test data
    const data = fs.read(module.path);
    let inputByteArray = data.toByteArray();

    // POSTing byte array
    let exchange = request({
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

    const resource = getResource('./upload_test.png');
    const inputStream = resource.getInputStream();
    // small <1k file, just read it all in
    const size = resource.getLength();
    inputByteArray = new binary.ByteArray(size);
    inputStream.read(inputByteArray, 0, size);
    exchange = request({
        url: baseUri,
        method: "POST",
        data: resource.getInputStream()
    });
    assert.strictEqual(inputByteArray.length, exchange.contentBytes.length);
    assert.deepEqual(inputByteArray.toArray(), exchange.contentBytes.toArray());
};

exports.testPostMultipart = () => {

    const textFile = module.resolve("text_test.txt");
    const imageFile = module.resolve("upload_test.png");
    const received = {};

    getResponse = (req) => {
        const encoding = req.env.servletRequest.getCharacterEncoding() || "utf8";
        const params = parseFileUpload(req, {}, encoding);
        Object.keys(params).forEach(key => {
            received[key] = params[key];
        });
        return response.html("OK");
    };

    const title = "testing multipart post";
    const textStream = fs.open(textFile, {"read": true, "charset": "utf-8"});
    const textFileStream = fs.open(textFile, {"read": true, "charset": "utf-8"});
    const binaryStream = fs.open(imageFile, {"read": true, "binary": true});

    const inputStream = fs.open(imageFile, {"read": true, "binary": true});
    // small <1k file, just read it all in
    const size = fs.size(imageFile);
    const imageByteArray = new binary.ByteArray(size);
    inputStream.readInto(imageByteArray, 0, size);

    const exchange = request({
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
    const expectedText = fs.read(textFile).replace(/\r\n/g, "\n");
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

exports.testProxiedRequest = () => {
    const text = "<h1>This is the Response Text</h1>";

    getResponse = () => {
        return response.html(text);
    };

    let exchange = request({
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

exports.testIterateExchange_Issue287 = () => {
    //exchange.headers
    const text = "<h1>This is the Response Text</h1>";

    getResponse = () => {
        return response.html(text);
    };

    const exchange = request({
        url: baseUri
    });
    assert.strictEqual(exchange.content, text);

    const clone = objects.clone(exchange.headers, false, 0);
    assert.deepEqual(exchange.headers, clone);
    assert.isUndefined(exchange.headers[null]);
};

exports.testTimeoutResponse_Issue267 = () => {
    getResponse = () => {
        const started = Date.now();
        let loops = 0;
        while (Date.now() - started < 100) {
            loops++;
        }
        return response.text("did " + loops + " loops in " + (Date.now() - started) + " milliseconds.");
    };

    assert.throws(function() {
        request({
            readTimeout: 1,
            url: baseUri
        });
        assert.fail("This should not be reachable!");
    }, java.net.SocketTimeoutException, "A timeout request should throw an exception!");
};

exports.testNoCallbacks = () => {
    getResponse = () => response.text("foo");

    let anyCallbackCalled = false;
    const exchange = request({
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

exports.testMultipleHeaders_Issue225 = () => {
    getResponse = (req) => {
        assert.equal(req.env.servletRequest.getHeader("single-header"), "one", "Header not present");
        assert.equal(req.env.servletRequest.getHeader("multiple-header"), "one,two", "Multiple headers not merged into one");
        return response.text("done");
    };

    const preparedHeaders = Headers({});
    preparedHeaders.set("single-header", "one");
    preparedHeaders.add("multiple-header", "one");
    preparedHeaders.add("multiple-header", "two");

    request({
        url: baseUri,
        headers: preparedHeaders
    });
};

exports.testStreamResponse = () => {
    getResponse = () => {
        const bs = new MemoryStream(3);
        bs.write(new binary.ByteString("\t\r\n", "ASCII"));
        bs.position = 0;
        return response.stream(bs);
    };

    const exchange = request({
        url: baseUri
    });

    assert.strictEqual(exchange.content, "\t\r\n");
};

exports.testBinaryResponse = () => {
    getResponse = () => {
        return response.binary(new binary.ByteArray([35, 114, 105, 110, 103, 111, 106, 115]));
    };

    const exchange = request({
        url: baseUri,
        binary: true
    });

    assert.strictEqual(exchange.contentBytes.toArray().join(""), [35, 114, 105, 110, 103, 111, 106, 115].join(""));
};

exports.testBinaryPart = () => {
    let bin, result;
    let sw = new StringWriter();
    let bos = new ByteArrayOutputStream();

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
        sw = new StringWriter();
        bos = new ByteArrayOutputStream();
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

exports.testTextPart = () => {
    let tp, result;
    let sw = new StringWriter();
    let bos = new ByteArrayOutputStream();

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
    sw = new StringWriter();

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
    sw = new StringWriter();

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
if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
