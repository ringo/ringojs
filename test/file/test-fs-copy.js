var assert = require("assert");
var fs = require("fs");
var {ByteArray} = require("binary");

var Files = java.nio.file.Files,
    Paths = java.nio.file.Paths;

var testFile = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "copytest.txt");

exports.setUp = function() {
    fs.touch(testFile);
};

exports.testCopy = function() {
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

    // overwrite the file
    fs.copy(testFile, testFile);

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

    // create a second file
    var copyFile = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "copytest-copy.txt");
    fs.copy(testFile, copyFile);

    stream = fs.open(copyFile, "rb");
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

exports.testCopyTree = function() {
    var tempDir = java.lang.System.getProperty("java.io.tmpdir");

    var rootTree1 = fs.join(tempDir, "tree1-" + Date.now());
    var rootTree2 = fs.join(tempDir, "tree2-" + Date.now());

    fs.makeTree(fs.join(rootTree1, "level1", "level2", "level3"));
    fs.copyTree(rootTree1, rootTree2);

    assert.isTrue(Files.exists(Paths.get(fs.join(rootTree2, "level1", "level2", "level3"))));
    assert.isTrue(Files.isDirectory(Paths.get(fs.join(rootTree2, "level1"))));
    assert.isTrue(Files.isDirectory(Paths.get(fs.join(rootTree2, "level1", "level2"))));
    assert.isTrue(Files.isDirectory(Paths.get(fs.join(rootTree2, "level1", "level2", "level3"))));

    fs.removeTree(rootTree1);
    fs.removeTree(rootTree2);

    assert.isFalse(Files.exists(Paths.get(rootTree1)));
    assert.isFalse(Files.exists(Paths.get(rootTree2)));
};

exports.testCopyComplexTree = function() {
    var tempDir = java.lang.System.getProperty("java.io.tmpdir");

    var rootTree1 = fs.join(tempDir, "tree1-" + Date.now());
    var rootTree2 = fs.join(tempDir, "tree2-" + Date.now());

    fs.makeTree(fs.join(rootTree1, "level1", "level2", "level3"));

    fs.touch(fs.join(rootTree1, "level1", "file1-level1.txt"));
    fs.touch(fs.join(rootTree1, "level1", "file2-level1.txt"));
    fs.touch(fs.join(rootTree1, "level1", "level2", "level3", "file1-level3.txt"));

    fs.copyTree(rootTree1, rootTree2);

    assert.isTrue(Files.exists(Paths.get(fs.join(rootTree2, "level1", "level2", "level3"))));
    assert.isTrue(Files.exists(Paths.get(fs.join(rootTree1, "level1", "file1-level1.txt"))));
    assert.isTrue(Files.exists(Paths.get(fs.join(rootTree1, "level1", "file2-level1.txt"))));
    assert.isTrue(Files.exists(Paths.get(fs.join(rootTree1, "level1", "level2", "level3", "file1-level3.txt"))));
    assert.isTrue(Files.isDirectory(Paths.get(fs.join(rootTree2, "level1"))));
    assert.isTrue(Files.isDirectory(Paths.get(fs.join(rootTree2, "level1", "level2"))));
    assert.isTrue(Files.isDirectory(Paths.get(fs.join(rootTree2, "level1", "level2", "level3"))));
    assert.isTrue(Files.isRegularFile(Paths.get(fs.join(rootTree1, "level1", "file1-level1.txt"))));
    assert.isTrue(Files.isRegularFile(Paths.get(fs.join(rootTree1, "level1", "file2-level1.txt"))));
    assert.isTrue(Files.isRegularFile(Paths.get(fs.join(rootTree1, "level1", "level2", "level3", "file1-level3.txt"))));

    fs.removeTree(rootTree1);
    fs.removeTree(rootTree2);

    assert.isFalse(Files.exists(Paths.get(rootTree1)));
    assert.isFalse(Files.exists(Paths.get(rootTree2)));
};

exports.testCopyTreeAsFiles = function() {
    assert.isTrue(Files.exists(Paths.get(testFile)));

    var stream = fs.open(testFile, "wb");
    var ba = new ByteArray([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    try {
        stream.write(ba);
        stream.flush();
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }

    var file2 = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "file2" + Date.now());
    fs.copyTree(testFile, file2);

    assert.isTrue(Files.exists(Paths.get(testFile)));
    assert.isTrue(Files.exists(Paths.get(file2)));
    assert.isFalse(Files.isDirectory(Paths.get(testFile)));
    assert.isFalse(Files.isDirectory(Paths.get(file2)));

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

    fs.removeTree(file2);

    assert.isFalse(Files.exists(Paths.get(file2)));
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