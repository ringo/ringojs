var assert = require("assert");
var fs = require("fs");

var testDir = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "touchtest");

exports.setUp = function() {
    fs.makeTree(testDir);
};

exports.tearDown = function() {
    fs.removeTree(testDir);
};

exports.testTouch = function() {
    var path = fs.join(testDir, "test");
    assert.isFalse(fs.exists(path));
    // touch without mtime argument creates an empty file
    assert.isTrue(fs.touch(path));
    assert.isTrue(fs.exists(path));
    var mtime = new Date(2012, 11, 9, 15, 28, 31, 0);
    assert.isTrue(fs.touch(path, mtime));
    assert.strictEqual(fs.lastModified(path).getTime(), mtime.getTime());
};

if (require.main === module.id) {
    run(exports);
}