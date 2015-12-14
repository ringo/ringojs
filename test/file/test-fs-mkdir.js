var assert = require("assert");
var fs = require("fs");

var Files = java.nio.file.Files,
    Paths = java.nio.file.Paths;

var log = require("ringo/logging").getLogger(module.id);

var supportLinks = (function() {
    var file = java.nio.file.Files.createTempFile("foo", ".txt");
    var link = java.nio.file.Paths.get(file.getParent(), "pseudolink" + Date.now());

    try {
        java.nio.file.Files.createSymbolicLink(link, file);
        java.nio.file.Files.delete(link);
        java.nio.file.Files.delete(file);
        return true;
    } catch (ex) {
        return false;
    }
})();

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
    if (!supportLinks) {
        log.info("Skipping test, symbolic links not supported");
        return;
    }

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
    var root = String(java.nio.file.Files.createTempDirectory("root-test"));
    var tree = fs.join(root, "level1", "level2", "level3");
    fs.makeTree(tree);

    assert.isTrue(Files.exists(Paths.get(tree)));
    assert.isTrue(Files.isDirectory(Paths.get(tree)));

    fs.removeTree(root);
    assert.isFalse(Files.exists(Paths.get(tree)));
    assert.isFalse(Files.isDirectory(Paths.get(tree)));
    assert.isFalse(Files.exists(Paths.get(root)));
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}