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
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    var {run} = require("test");
    require("system").exit(run(exports));
}
