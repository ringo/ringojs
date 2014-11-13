var assert = require("assert");
var fs = require("fs");

var testFile = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "opentest.txt");

exports.setUp = function() {
    fs.touch(testFile);
};

exports.testOpen = function() {
    assert.isTrue(fs.exists(testFile));

    try {
        fs.open(testFile, "rw");
    } catch (err) {
        assert.strictEqual(err.message, "Cannot open a file for reading and writing at the same time");
    }

    try {
        fs.open(testFile, {
            read: true,
            write: true
        });
    } catch (err) {
        assert.strictEqual(err.message, "Cannot open a file for reading and writing at the same time");
    }
};

exports.testOpenRaw = function() {
    assert.isTrue(fs.exists(testFile));

    try {
        fs.openRaw(testFile, {
            read: true,
            write: true
        });
    } catch (err) {
        assert.strictEqual(err.message, "Cannot open a file for reading and writing at the same time");
    }
};

exports.tearDown = function() {
    try {
        fs.remove(testFile);
    } catch (e) {
        // do nothing
    }
};

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}