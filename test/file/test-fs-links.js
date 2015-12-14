var assert = require("assert");
var fs = require("fs");

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


exports.testSymbolicLink = function() {
    if (!supportLinks) {
        log.info("Skipping test, symbolic links not supported");
        return;
    }

    var hard = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "hard-" + Date.now()),
        symbolic = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "symlinkk-" + Date.now());

    fs.touch(hard);

    var hardPath = java.nio.file.FileSystems.getDefault().getPath(hard);
    var symPath = java.nio.file.FileSystems.getDefault().getPath(symbolic);
    assert.isTrue(java.nio.file.Files.exists(hardPath));
    assert.isFalse(java.nio.file.Files.isSymbolicLink(hardPath));

    assert.equal(fs.symbolicLink(hard, symbolic), symbolic);

    assert.isTrue(java.nio.file.Files.exists(hardPath));
    assert.isFalse(java.nio.file.Files.isSymbolicLink(hardPath));
    assert.isTrue(java.nio.file.Files.exists(symPath));
    assert.isTrue(java.nio.file.Files.isSymbolicLink(symPath));

    fs.remove(symbolic);
    fs.remove(hard);
    assert.isFalse(java.nio.file.Files.exists(hardPath));
    assert.isFalse(java.nio.file.Files.exists(symPath));
};

exports.testHardLink = function() {
    var sourceFile = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "sourceFile-" + Date.now()),
        hardLink = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "hardLink-" + Date.now());

    fs.touch(sourceFile);

    var sourcePath = java.nio.file.FileSystems.getDefault().getPath(sourceFile);
    var hardLinkPath = java.nio.file.FileSystems.getDefault().getPath(hardLink);
    assert.isTrue(java.nio.file.Files.exists(sourcePath));
    assert.isFalse(java.nio.file.Files.isSymbolicLink(hardLinkPath));

    fs.hardLink(sourcePath, hardLinkPath);

    assert.isTrue(java.nio.file.Files.exists(sourcePath));
    assert.isTrue(java.nio.file.Files.exists(hardLinkPath));
    assert.isTrue(java.nio.file.Files.isSameFile(sourcePath, hardLinkPath));

    fs.remove(sourceFile);
    fs.remove(hardLink);
    assert.isFalse(java.nio.file.Files.exists(sourcePath));
    assert.isFalse(java.nio.file.Files.exists(hardLinkPath));
};

exports.testReadLink = function() {
    if (!supportLinks) {
        log.info("Skipping test, symbolic links not supported");
        return;
    }

    var source = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "source-" + Date.now()),
        symbolic = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "symlinkk-" + Date.now());

    fs.touch(source);

    var sourcePath = java.nio.file.FileSystems.getDefault().getPath(source);
    var symbolicPath = java.nio.file.FileSystems.getDefault().getPath(symbolic);
    assert.isTrue(java.nio.file.Files.exists(sourcePath));

    fs.symbolicLink(source, symbolic);
    assert.isTrue(java.nio.file.Files.isSymbolicLink(symbolicPath));
    assert.equal(fs.readLink(symbolic), sourcePath.toString());

    assert.throws(function () {
        fs.readLink(source);
    }, java.nio.file.NotLinkException);

    fs.remove(source);

    try {
        fs.readLink(symbolic);
        assert.fail("Link should not be readable!");
    } catch (e) {
        assert.equal(e.message, "Path " + symbolic + " is not readable!");
    }

    assert.isTrue(java.nio.file.Files.isSymbolicLink(symbolicPath));
    fs.remove(symbolic);
    assert.isFalse(java.nio.file.Files.isSymbolicLink(symbolicPath));
};


if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}