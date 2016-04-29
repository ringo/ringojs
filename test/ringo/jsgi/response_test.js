var io = require("io");
var binary = require("binary");
var assert = require("assert");

var {JsgiResponse} = require("ringo/jsgi/response");

exports.setUp = exports.tearDown = function() {}

exports.testHttpStatus = function () {
    var res = new JsgiResponse();

    var expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: [""]
    });

    // test initial state
    assert.deepEqual(res, expected);

    // Change status to 201
    res.setStatus(201);
    expected.status = 201;
    assert.deepEqual(res, expected);

    // Change status back to 200
    res.ok();
    expected.status = 200;
    assert.deepEqual(res, expected);

    // Change status to 201
    res.created();
    expected.status = 201;
    assert.deepEqual(res, expected);

    // Test other status codes
    res.bad();
    expected.status = 400;
    assert.deepEqual(res, expected);

    res.unauthorized();
    expected.status = 401;
    assert.deepEqual(res, expected);

    res.forbidden();
    expected.status = 403;
    assert.deepEqual(res, expected);

    res.notFound();
    expected.status = 404;
    assert.deepEqual(res, expected);

    res.gone();
    expected.status = 410;
    assert.deepEqual(res, expected);

    res.error();
    expected.status = 500;
    assert.deepEqual(res, expected);

    res.unavailable();
    expected.status = 503;
    assert.deepEqual(res, expected);

    res.notModified();
    expected.status = 304;
    expected.headers = {};
    assert.deepEqual(res, expected);

    res.redirect("http://ringojs.org/");
    expected.status = 303
    expected.headers = { location: "http://ringojs.org/" };
    expected.body = ["See other: http://ringojs.org/"];
    assert.deepEqual(res, expected);
};

exports.testText = function () {
    var res = new JsgiResponse();

    var expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: ["Hello World!", "1234"]
    });

    assert.deepEqual(res.text("Hello World!", 1234), expected);
};

exports.testHtml = function () {
    var res = new JsgiResponse();

    var expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: ["<html>", "<h1>Hello World!</h1>", "1234", "</html>"]
    });

    assert.deepEqual(res.html("<html>", "<h1>Hello World!</h1>", 1234, "</html>"), expected);
};

exports.testJson = function () {
    var res = new JsgiResponse();

    var expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: ["{\"foo\":\"bar\"}"]
    });

    assert.deepEqual(res.json({foo: "bar"}), expected);
};

exports.testJsonp = function () {
    var res = new JsgiResponse();

    var expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "application/javascript; charset=utf-8" },
        body: ["doSomething", "(", "{\"foo\":\"bar\"}",");"]
    });

    assert.deepEqual(res.jsonp("doSomething", {foo: "bar"}), expected);
};

exports.testXml = function () {
    var res = new JsgiResponse();

    var expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "application/xml" },
        body: ["<xml>this is xml</xml>"]
    });

    assert.deepEqual(res.xml("<xml>this is xml</xml>"), expected);
    assert.deepEqual(res.xml(new XML("<xml>this is xml</xml>")), expected);
};

exports.testStream = function () {
    var stream = new io.MemoryStream(8);
    var ba = new binary.ByteArray([0, 1, 2, 3, 4, 5, 6, 7]);
    stream.write(ba);
    var res = new JsgiResponse().stream(stream);

    assert.equal(res.status, 200);
    assert.deepEqual(res.headers, { "content-type": "application/octet-stream" });
    assert.equal(res.body.length, 8);

    res.body.readInto(ba);
    assert.deepEqual(ba.toArray(), [0, 1, 2, 3, 4, 5, 6, 7]);

    res = new JsgiResponse().stream(stream, "application/pdf");
    stream.write(ba);
    assert.deepEqual(res.headers, { "content-type": "application/pdf" });
    res.body.readInto(ba);
    assert.deepEqual(ba.toArray(), [0, 1, 2, 3, 4, 5, 6, 7]);
};

exports.testSetCharset = function () {
    var res = new JsgiResponse();

    var expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "text/plain; charset=ISO-8859-1" },
        body: ["Use ISO-8859-1"]
    });

    assert.deepEqual(res.setCharset("ISO-8859-1").text("Use ISO-8859-1"), expected);
};


exports.testAddHeaders = function () {
    var res = new JsgiResponse();

    var expected = new JsgiResponse({
        status: 200,
        headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-foo": "bar",
            "boo": "far",
            "x-limit": "100"
        },
        body: [""]
    });

    assert.deepEqual(res.addHeaders({"x-foo": "bar", boo: "far", "x-limit": "100"}), expected);

    // multiple headers chained
    res = new JsgiResponse();
    res.addHeaders({ foo: "bar" }).addHeaders({ foo: "baz" }).addHeaders({ foo: 12345 });
    assert.deepEqual(res.headers,  {
        "content-type": "text/plain; charset=utf-8",
        "foo": ["bar", "baz", "12345"]
    });
    assert.isTrue(Array.isArray(res.headers.foo));
    assert.isTrue(res.headers.foo.indexOf("bar") >= 0);
    assert.isTrue(res.headers.foo.indexOf("baz") >= 0);
    assert.isTrue(res.headers.foo.indexOf("12345") >= 0);
    assert.isTrue(res.headers.foo.every(function(val) {
        return typeof val === "string";
    }))

    // multiple headers as array
    res = new JsgiResponse();
    res.addHeaders({ foo: ["bar", "baz", 12345] });
    assert.deepEqual(res.headers,  {
        "content-type": "text/plain; charset=utf-8",
        "foo": ["bar", "baz", "12345"]
    });
    assert.isTrue(Array.isArray(res.headers.foo));
    assert.isTrue(res.headers.foo.indexOf("bar") >= 0);
    assert.isTrue(res.headers.foo.indexOf("baz") >= 0);
    assert.isTrue(res.headers.foo.indexOf("12345") >= 0);
    assert.isTrue(res.headers.foo.every(function(val) {
        return typeof val === "string";
    }))
};

exports.testHelpers = function() {
    var response = require("ringo/jsgi/response");

    var expected = new JsgiResponse({
        status: 123,
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: ["Hello World!"]
    });

    assert.deepEqual(response.text("Hello World!").setStatus(123), expected);

    expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: ["<h1>Hello World!</h1>"]
    });

    assert.deepEqual(response.html("<h1>Hello World!</h1>"), expected);
    assert.deepEqual(response.html("<h1>Hello World!</h1>").ok(), expected);

    expected.status = 201;
    assert.deepEqual(response.html("<h1>Hello World!</h1>").created(), expected);

    expected.status = 400;
    assert.deepEqual(response.html("<h1>Hello World!</h1>").bad(), expected);

    expected.status = 401;
    assert.deepEqual(response.html("<h1>Hello World!</h1>").unauthorized(), expected);

    expected.status = 403;
    assert.deepEqual(response.html("<h1>Hello World!</h1>").forbidden(), expected);

    expected.status = 404;
    assert.deepEqual(response.html("<h1>Hello World!</h1>").notFound(), expected);

    expected.status = 410;
    assert.deepEqual(response.html("<h1>Hello World!</h1>").gone(), expected);

    expected.status = 500;
    assert.deepEqual(response.html("<h1>Hello World!</h1>").error(), expected);

    expected.status = 503;
    assert.deepEqual(response.html("<h1>Hello World!</h1>").unavailable(), expected);

    expected = new JsgiResponse({
        status: 303,
        headers: { location: "http://ringojs.org/" },
        body: ["See other: http://ringojs.org/"]
    });
    assert.deepEqual(response.redirect("http://ringojs.org/"), expected);

    expected = new JsgiResponse({
        status: 304,
        headers: {},
        body: [""]
    });
    assert.deepEqual(response.notModified(), expected);

    expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: ["{\"foo\":\"bar\"}"]
    });

    assert.deepEqual(response.json({foo: "bar"}), expected);

    expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "application/javascript; charset=utf-8" },
        body: ["mycbk", "(", "{\"foo\":\"bar\"}", ");"]
    });

    assert.deepEqual(response.jsonp("mycbk", {foo: "bar"}), expected);

    expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "application/xml" },
        body: ["<xml>this is xml</xml>"]
    });

    assert.deepEqual(response.xml("<xml>this is xml</xml>"), expected);
    assert.deepEqual(response.xml(new XML("<xml>this is xml</xml>")), expected);

    expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "text/html; charset=ISO-8859-1" },
        body: ["<html>foo</html>"]
    });

    assert.deepEqual(response.html("<html>foo</html>").setCharset("ISO-8859-1"), expected);

    expected = new JsgiResponse({
        status: 200,
        headers: { "content-type": "application/xml", "x-foo": "bar" },
        body: ["<xml>this is xml</xml>"]
    });

    assert.deepEqual(response.xml("<xml>this is xml</xml>").addHeaders({"x-foo": "bar"}), expected);
};

// start the test runner if we're called directly from command line
if (require.main === module) {
    var {run} = require("test");
    require("system").exit(run(exports));
}
