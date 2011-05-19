var assert = require("assert");
var base16 = require('ringo/base16');
var {ByteString} = require('binary');

var data = [
    ["pleasure", "706C656173757265"],
    ["leasure", "6C656173757265"],
    ["easure", "656173757265"],
    ["asure", "6173757265"],
    ["sure", "73757265"],
    ["\u2665", "E299A5"]
];

exports.testEncodeDecode = function () {
    for each (var test in data) {
        assert.strictEqual(base16.encode(test[0]), test[1]);
        assert.strictEqual(base16.decode(base16.encode(test[0])), test[0]);
        assert.deepEqual(base16.decode(
                base16.encode(test[0]), 'raw').toArray(),
                new ByteString(test[0], 'utf8').toArray());
    }
};