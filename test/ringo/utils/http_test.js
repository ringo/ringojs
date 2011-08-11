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
    var result;

    result = http.parseParameters('foo1=val1&foo2=val2');
    assert.isNotUndefined(result.foo1);
    assert.isNotUndefined(result.foo2);
    assert.strictEqual(result.foo1, 'val1');
    assert.strictEqual(result.foo2, 'val2');

    result = http.parseParameters('foo[]=1&foo[]=2&foo[]=3&foo[]=4&foo[]=5&bar=baz');
    assert.isNotUndefined(result.foo);
    assert.isNotUndefined(result.bar);
    assert.isTrue(Array.isArray(result.foo));
    assert.strictEqual(result.foo.length, 5);
    assert.strictEqual(result.foo.sort().join(','), '1,2,3,4,5');
    assert.strictEqual(result.bar, 'baz');

    result = http.parseParameters('foo=1&foo=2&foo=3&foo=4&foo=5&bar=baz');
    assert.isNotUndefined(result.foo);
    assert.isNotUndefined(result.bar);
    assert.isTrue(Array.isArray(result.foo));
    assert.strictEqual(result.foo.length, 5);
    assert.strictEqual(result.foo.sort().join(','), '1,2,3,4,5');
    assert.strictEqual(result.bar, 'baz');
};