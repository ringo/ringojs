const assert = require("assert");
const dates = require("ringo/utils/dates");
const strings = require("ringo/utils/strings");
const http = require("ringo/utils/http");

exports.testGetMimeParameter = function() {
    // [test, expectedResult]
    const testCases = [
        ["Content-Type: text/plain; charset=UTF-8", "charset", "UTF-8"],
        ["Content-Type: text/plain; charset=UTF-8; foo=bar", "foo", "bar"],
        ["Content-Type: text/plain; charset=UTF-8; FOO=bar", "foo", "bar"],
        ["Content-Type: text/plain; charset=UTF-8; FOO=BAR", "foo", "BAR"],
        ["Content-Type: text/plain; charset=UTF-8; FOO=BAR", "charset", "UTF-8"],

        ["Content-Type: text/weird; weird*=us-ascii'en-us'This%20is%20wierd.", "weird", "us-ascii'en-us'This%20is%20wierd."],

        // RFC 2231: Note that quotes around parameter values are part of the value
        // syntax; they are NOT part of the value itself.
        [
            "Content-Type: message/external-body; access-type=URL; URL=\"ftp://cs.utk.edu/pub/moore/bulk-mailer/bulk-mailer.tar\"",
            "URL",
            "ftp://cs.utk.edu/pub/moore/bulk-mailer/bulk-mailer.tar"
        ],
        [
            "Content-Type: message/external-body;\r\naccess-type=URL;\r\nURL=\"ftp://cs.utk.edu/pub/moore/bulk-mailer/bulk-mailer.tar\"",
            "access-type",
            "URL"
        ],
        [
            'Content-Type: text/plain; foo="bar and \\\\baz\\\\ bar"',
            'foo',
            'bar and \\baz\\ bar'
        ],
        [
            'Content-Type: text/plain; foo="bar and \\"baz\\" bar"',
            'foo',
            'bar and "baz" bar'
        ],
        [
            'Content-Type: text/plain; foo="<bar>\\"bar\\"@"',
            'foo',
            '<bar>"bar"@'
        ]
    ];

    testCases.forEach(function(test, index) {
        assert.deepEqual(http.getMimeParameter(test[0], test[1]), test[2], "testCase[" + index + "] failed! " + test[0]);
    });
};

exports.testUrlEncode = function() {
    // [test, expectedResult]
    const testCases = [
        [{foo: 1, bar: "baz"}, "foo=1&bar=baz"],
        [{foo: 1, bar: "baz baz \uD83D\uDE00"}, "foo=1&bar=baz%20baz%20%F0%9F%98%80"],
        [{foo: [1, 2, 3, 4, 5], bar: "baz"}, "foo=1&foo=2&foo=3&foo=4&foo=5&bar=baz"],
        [{foo: ["1 2 3", "baz baz \uD83D\uDE00"], bar: "baz"}, "foo=1%202%203&foo=baz%20baz%20%F0%9F%98%80&bar=baz"],
        [{foo: { bar: { baz: "1234"}}}, "foo%5Bbar%5D%5Bbaz%5D=1234"],
        [{foo: { bar: { baz: "1234"}, buz: "56 78"}}, "foo%5Bbar%5D%5Bbaz%5D=1234&foo%5Bbuz%5D=56%2078"],
        [{foo: {bar: [""]}}, "foo%5Bbar%5D%5B%5D="],
        [{foo: {bar: [{baz: "hello"}]}}, "foo%5Bbar%5D%5B%5D%5Bbaz%5D=hello"],
        [{foo: {bar: [{baz: "hello", buz: "world"}]}}, "foo%5Bbar%5D%5B%5D%5Bbaz%5D=hello&foo%5Bbar%5D%5B%5D%5Bbuz%5D=world"],
        [{"foo[bar]asdf[baz]": "hello"}, "foo%5Bbar%5Dasdf%5Bbaz%5D=hello"]
    ];

    testCases.forEach(function(test, index) {
        assert.deepEqual(http.urlEncode(test[0]), test[1], "testCase[" + index + "] failed! " + test[0]);
    });
};

exports.testParseParameters = function() {
    // [test, expectedResult]
    const testCases = [
        ["a", { a: ""}],
        ["a&", { a: ""}],
        ["&a&", { a: ""}],
        ["a&&", { a: ""}],
        ["a=", { a: ""}],
        ["a=&", { a: ""}],
        ["a=&&", { a: ""}],
        ["a=1", { a: "1"}],
        ["a=1&", { a: "1"}],
        ["a=1&&", { a: "1"}],
        ["a=1&a=1", { a: ["1", "1"]}],
        ["a=1&&a=1", { a: ["1", "1"]}],
        ["a=b=&&c=d&e=f&&&g=h", { a: "b=", c: "d", e: "f", g: "h" }],
        ["a=b=c=d&e=f=g=h", { a: "b=c=d", e: "f=g=h" }],
        ["a=1&a=2", { a: ["1", "2"]}],

        // +
        ["+a+", { " a ": ""}],
        ["+a+=1", { " a ": "1"}],
        ["+a=1+", { " a": "1 "}],
        ["+a+=+1+&+b+=+1+", { " a ": " 1 ", " b ": " 1 "}],

        // junk params
        ["", {}],
        ["=", {}],
        ["&", {}],
        ["=&", {}],
        ["=&=", {}],
        ["&&", {}],
        ["&=", {}],
        ["&=1", {}],

        // It's not the job of parseParameters() to separate link hashes
        ["a=1&a=2#a=3", { a: ["1", "2#a=3"]}],
        ["a=1&a=2%23a=3", { a: ["1", "2#a=3"]}],

        ["a%20b=c%20d", { "a b": "c d"}],
        ["a=1&b=2&c=b%26c%3Dd", { "a": "1", "b": "2", c: "b&c=d"}],
        ["%20a%20b%20=%20c%20d%20", { " a b ": " c d "}],
        ["a=b&c=d", { a: "b", c: "d"}],
        ["a[]=1&a[]=2&a[]=3", { a: ["1", "2","3"]}],
        ["a=日本語0123456789日本語カタカナひらがな", { a: "日本語0123456789日本語カタカナひらがな"}],
        [
            "a=http%3A%2F%2Fringojs.org%2F%20foo%20bar%20buzz%2F!a%26b%3Dc",
            { a: "http://ringojs.org/ foo bar buzz/!a&b=c"}
        ],
        ["a=%3Db=", { "a": "=b=" }],
        ["a%3D=b", { "a=": "b" }],
        ["a=a%3Db", { a: "a=b" }],
        ["a=1&empty1=&empty2=", { a: "1", empty1: "", empty2: ""}],
        ["a=1&empty1=&empty2", { a: "1", empty1: "", empty2: ""}],

        ["a&b=1", { a: "", b: "1"}],
        ["a&b=1&c", { a: "", b: "1", c: ""}],
        ["&&&", {}],

        ["foo[bar][baz]=hello", {foo: {bar: {baz: "hello"}}}],
        [
            "foo[bar][baz]=hello&foo[bor][baz]=world",
            {foo: {bar: {baz: "hello"}, bor: {baz: "world"}}}
        ],
        [
            "foo[bar][baz]=hello&foo[bar][boo]=world",
            {foo: {bar: {baz: "hello", boo: "world"}}}
        ],
        [
            "foo[bar][baz]=hello&foo[bar][baz]=world",
            {foo: {bar: {baz: "world"}}}
        ],
        [
            "foo[bar][baz]=http%3A%2F%2Fringojs.org%2F%20foo%20bar%20buzz%2F!a%26b%3Dc",
            {foo: {bar: {baz: "http://ringojs.org/ foo bar buzz/!a&b=c"}}}
        ],
        ["foo[bar][][baz]=hello", {foo: {bar: [{baz: "hello"}]}}],
        ["foo[bar][]=", {foo: {bar: [""]}}],
        ["foo[bar]asdf[baz]=hello", {"foo[bar]asdf[baz]": "hello"}],
        ["foo=%F0%9D%8C%86-%E2%98%83%F0%9F%98%80", { foo: "\uD834\uDF06-\u2603\uD83D\uDE00" }],

        // See: https://github.com/nodejs/node/master/test/parallel/test-querystring.js
        // See: https://github.com/joyent/node/issues/1707
        ["toString=12345", { "toString": "12345"}],
        ["hasOwnProperty=12345", { "hasOwnProperty": "12345"}],
        ["__defineGetter__=12345", { "__defineGetter__": "12345"}],
        ["valueOf=12345", { "valueOf": "12345"}]
    ];

    testCases.forEach(function(test, index) {
        assert.deepEqual(http.parseParameters(test[0]), test[1], "testCase[" + index + "] failed! " + test[0]);
    });
};

exports.testSetCookie = function() {
    // a simple cookie
    assert.equal(http.setCookie("foo", "bar"), "foo=bar; Path=/");

    // test cookie with expiration date
    let endDate = new Date(Date.now() + 86400000);
    let dateStr = dates.format(endDate, "EEE, dd-MMM-yyyy HH:mm:", "en", "GMT");
    let headerStr = http.setCookie("foo", "bar", 1);
    assert.isTrue(headerStr.indexOf("foo=bar; Expires=") === 0, "Invalid cookie date string!");
    assert.equal(headerStr.indexOf(dateStr), 17, "Date starts at wrong position! " + headerStr);
    assert.equal(headerStr.indexOf(" GMT;"), 42, "Timezone information missing! " + headerStr);
    assert.isTrue(strings.endsWith(headerStr, "; Path=/"), "Cookie must end with path!");

    // expires as Date
    endDate = new Date();
    dateStr = dates.format(endDate, "EEE, dd-MMM-yyyy HH:mm:ss zzz", "en", "GMT");
    headerStr = http.setCookie("foo", "bar", endDate);
    assert.isTrue(headerStr.indexOf("foo=bar; Expires=") === 0, "Invalid cookie date string!");
    assert.equal(headerStr.indexOf(dateStr), 17, "Date starts at wrong position! " + headerStr);
    assert.equal(headerStr.indexOf(" GMT;"), 42, "Timezone information missing! " + headerStr);
    assert.isTrue(strings.endsWith(headerStr, "; Path=/"), "Cookie must end with path!");

    assert.throws(function() {
        http.setCookie("foo", "bar", "invalid");
    });

    assert.throws(function() {
        http.setCookie("foo", "bar", NaN);
    });

    // reset cookie
    assert.equal(http.setCookie("foo", "bar", 0), "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/");

    // paths
    assert.equal(
        http.setCookie("foo", "bar", 0, { path: "/1/2/3" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/2/3"
    );
    assert.equal(
        http.setCookie("foo", "bar", 0, { path: "/123456789/abcdefghijklmnopqrstuvwxyz/\uD83C\uDFCC" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/123456789/abcdefghijklmnopqrstuvwxyz/%F0%9F%8F%8C"
    );
    assert.throws(function() {
        http.setCookie("foo", "bar", 0, { path: "/1/\n/3" });
    });
    assert.throws(function() {
        http.setCookie("foo", "bar", 0, { path: "/1/foo\tbar/3" });
    });
    assert.throws(function() {
        http.setCookie("foo", "bar", 0, { path: "/1/;/3" });
    });
    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3"
    );
    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/öäü/3" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%C3%B6%C3%A4%C3%BC/3"
    );

    // options
    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; HttpOnly"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Secure; HttpOnly"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, sameSite: "Strict" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Secure; HttpOnly; SameSite=Strict"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, sameSite: "Lax" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Secure; HttpOnly; SameSite=Lax"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, sameSite: "strict" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Secure; HttpOnly; SameSite=strict"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, sameSite: "futureval" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Secure; HttpOnly; SameSite=futureval"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, sameSite: {} }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Secure; HttpOnly; SameSite=Strict"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, sameSite: new Date() }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Secure; HttpOnly; SameSite=Strict"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, sameSite: true }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Secure; HttpOnly; SameSite=Strict"
    );

    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, domain: "EXample.org" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Domain=example.org; Secure; HttpOnly"
    );
    assert.equal(http.setCookie("foo", "bar", 0, { path: "/1/ /3", httpOnly: true, secure: true, domain: "org" }),
        "foo=bar; Expires=Thu, 01-Jan-1970 00:00:00 GMT; Path=/1/%20/3; Domain=org; Secure; HttpOnly"
    );
};

exports.testHeadersOnObject = function() {
    let obj = {
        "One": "ValueOne",
        "two": "ValueTwo",
        "THREE": "  Value\nThree  "
    };

    http.Headers(obj);
    assert.equal(obj.get("one"), "ValueOne", "Unexpected value returned by header");
    assert.equal(obj.get("One"), "ValueOne", "Unexpected value returned by header");
    assert.equal(obj.get("two"), "ValueTwo", "Unexpected value returned by header");
    assert.equal(obj.get("three"), "ValueThree", "Unexpected value returned by header");
    assert.equal(obj.get("THREE"), "ValueThree", "Unexpected value returned by header");
    assert.equal(obj.get("ThReE"), "ValueThree", "Unexpected value returned by header");

    obj.set("ONE", "SecondValue");
    assert.equal(obj.get("one"), "SecondValue", "Unexpected value returned by header");

    obj.add("Four", "ValueFour");
    assert.equal(obj.get("four"), "ValueFour", "Unexpected value returned by header");

    assert.isTrue(obj.contains("ONE"), "Headers should contain one");
    assert.isTrue(obj.contains("TWO"), "Headers should contain two");
    assert.isTrue(obj.contains("three"), "Headers should contain three");
    assert.isTrue(obj.contains("four"), "Headers should contain four");

    obj.unset("ONE");
    assert.isUndefined(obj.get("one"), "Header value not unset");
};

exports.testHeadersMultipleNames = function() {
    let obj = {
        "single": "simplevalue",
        "multiple": "first"
    };

    http.Headers(obj);
    obj.add("multiple", "second");
    assert.equal(obj.get("multiple"), "first,second", "Multiple headers not merged!");
    obj.add("multiple", "third");
    assert.equal(obj.get("multiple"), "first,second,third", "Multiple headers not merged!");
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}