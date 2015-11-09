var assert = require("assert");
var fs = require('fs');
var separator = require('ringo/utils/files').separator;

exports.testJoin = function() {
    assert.equal(fs.join("foo", "bar", "baz"), ["foo", "bar", "baz"].join(separator));
    assert.equal(fs.join("foo" + separator, "bar" + separator + separator, "baz"), ["foo", "bar", "baz"].join(separator));
    assert.equal(fs.join("foo", "..", "bar"), "foo" + separator + ".." + separator + "bar");
    assert.equal(fs.join("foo", ".", "bar"), "foo" + separator + "." + separator + "bar");
    assert.equal(fs.join(separator, "foo", ".", "bar"), separator + "foo" + separator + "." + separator + "bar");
};

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}