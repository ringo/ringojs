var assert = require("assert");
var http = require("ringo/utils/http");

exports.testUrlEncode = function() {
    var encoded, expected;
    encoded = http.urlEncode({foo: 1, bar: "baz"});
    expected = "foo=1&bar=baz";
    assert.strictEqual(encoded, expected);
    encoded = http.urlEncode({foo: [1, 2, 3, 4, 5], bar: "baz"});
    expected = "foo=1&foo=2&foo=3&foo=4&foo=5&bar=baz";
    assert.strictEqual(encoded, expected);
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

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}