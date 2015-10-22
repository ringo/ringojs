var assert = require("assert");
var fs = require("fs");

var Files = java.nio.file.Files,
    Paths = java.nio.file.Paths;

exports.testMkdir = function() {
    var testDir = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "mkdirtest" + Date.now());

    assert.isFalse(fs.exists(testDir));

    try {
        fs.makeDirectory(testDir);

        var nioPath = java.nio.file.FileSystems.getDefault().getPath(testDir);
        assert.isTrue(java.nio.file.Files.exists(nioPath));

        fs.removeDirectory(testDir);
        assert.isFalse(java.nio.file.Files.exists(nioPath));

    } catch (err) {
        assert.fail("Could not create directory " + testDir + " " + err);
    }
};

exports.testSymbolicLink = function() {
    var testDir = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "mkdirtest-hard-" + Date.now()),
        symLink = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "mkdirtest-symlinkk-" + Date.now());

    fs.makeDirectory(testDir);

    var nioPath = java.nio.file.FileSystems.getDefault().getPath(testDir);
    assert.isTrue(java.nio.file.Files.exists(nioPath));

    java.nio.file.Files.createSymbolicLink(java.nio.file.FileSystems.getDefault().getPath(symLink), nioPath);

    assert.isFalse(fs.isLink(testDir));
    assert.isTrue(fs.isLink(symLink));

    fs.removeDirectory(testDir);
    fs.removeDirectory(symLink);
    assert.isFalse(java.nio.file.Files.exists(nioPath));
};

exports.testMakeTree = function() {
    var tempDir = java.lang.System.getProperty("java.io.tmpdir");
    var root = fs.join(tempDir, "tree-" + Date.now());
    var tree = fs.join(root, "level1", "level2", "level3");
    fs.makeTree(tree);

    assert.isTrue(Files.exists(Paths.get(tree)));
    assert.isTrue(Files.isDirectory(Paths.get(tree)));

    fs.remove(root);
    assert.isFalse(Files.exists(Paths.get(tree)));
    assert.isFalse(Files.isDirectory(Paths.get(tree)));
    assert.isFalse(Files.exists(Paths.get(root)));
};

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}