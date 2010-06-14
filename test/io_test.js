include('io');
var assert = require("assert");

exports.testReadFixed = function() {
    var resource = getResource('./io_test.js');
    var io = new Stream(resource.inputStream);
    var bytes = io.read(7);
    assert.strictEqual(bytes.length, 7);
    assert.strictEqual(bytes.decodeToString(), 'include');
};

exports.testReadIndefinite = function() {
    var resource = getResource('./assert.js');
    var io = new Stream(resource.inputStream);
    var bytes = io.read();
    assert.strictEqual(bytes.length, resource.length);
    assert.strictEqual(bytes.decodeToString(), resource.content);
};
