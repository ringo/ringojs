var assert = require("assert");
var fs = require("fs");
var {ByteArray} = require("binary");

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

    var stream = fs.openRaw(testFile, "w");

    var ba = new ByteArray([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

    try {
        stream.write(ba);
        stream.flush();
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }

    stream = fs.openRaw(testFile, "r");
    try {
        var buff = new ByteArray(10);
        assert.equal(stream.readInto(buff), 10);

        // Check the content
        for (var i = 0; i < buff.length; i++) {
            assert.equal(buff.charCodeAt(i), ba.charCodeAt(i));
        }
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }
};

exports.testOpenAndWrite = function() {
    assert.isTrue(fs.exists(testFile));
    var stream = fs.open(testFile, "wb");

    var ba = new ByteArray([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

    try {
        stream.write(ba);
        stream.flush();
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }

    stream = fs.open(testFile, "rb");
    try {
        var buff = new ByteArray(10);
        assert.equal(stream.readInto(buff), 10);

        // Check the content
        for (var i = 0; i < buff.length; i++) {
            assert.equal(buff.charCodeAt(i), ba.charCodeAt(i));
        }
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }
};

exports.testOpenAndAppend = function() {
    var ba = new ByteArray([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

    assert.isTrue(fs.exists(testFile));
    var stream = fs.open(testFile, "ab");

    try {
        stream.write(ba);
        stream.flush();
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }

    stream = fs.open(testFile, "ab");

    try {
        stream.write(ba);
        stream.flush();
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }

    stream = fs.open(testFile, "rb");
    try {
        var buff = new ByteArray(20);
        assert.equal(stream.readInto(buff), 20);

        // Check the content
        for (var i = 0; i < 10; i++) {
            assert.equal(buff.charCodeAt(i), ba.charCodeAt(i));
        }
        for (var u = 10; u < 20; u++) {
            assert.equal(buff.charCodeAt(i), ba.charCodeAt(i - 10));
        }
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }
};

exports.tearDown = function() {
    try {
        fs.remove(testFile);
    } catch (e) {
        // do nothing
    }
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}