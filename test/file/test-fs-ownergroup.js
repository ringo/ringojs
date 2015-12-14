var assert = require("assert");
var fs = require("fs");

var log = require("ringo/logging").getLogger(module.id);
var supportsPosix = java.nio.file.FileSystems.getDefault().supportedFileAttributeViews().contains("posix");

var testFile = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "ownergroup.txt");

exports.setUp = function() {
    fs.touch(testFile);
};

exports.testOwner = function() {
    if (!supportsPosix) {
        log.info("Skipping test, PosixFileAttributeView not supported");
        return;
    }

    assert.equal(fs.owner(testFile), java.lang.System.getProperty("user.name"));
};

exports.testGroup = function() {
    if (!supportsPosix) {
        log.info("Skipping test, PosixFileAttributeView not supported");
        return;
    }

    assert.isNotNull(fs.group(testFile));
};

exports.testChangeOwner = function() {
    if (!supportsPosix) {
        log.info("Skipping test, PosixFileAttributeView not supported");
        return;
    }

    assert.isNotNull(fs.changeOwner(testFile, java.lang.System.getProperty("user.name")));
    assert.equal(fs.owner(testFile), java.lang.System.getProperty("user.name"));

    assert.throws(function() {
        fs.changeOwner(testFile, "thisuserdoesnotexistforsureonthissystem" + Date.now());
    }, java.nio.file.attribute.UserPrincipalNotFoundException);
    assert.equal(fs.owner(testFile), java.lang.System.getProperty("user.name"));
};

exports.testChangeGroup = function() {
    if (!supportsPosix) {
        log.info("Skipping test, PosixFileAttributeView not supported");
        return;
    }

    var oldGroup = fs.group(testFile);

    assert.throws(function() {
        fs.changeGroup(testFile, "thisgroupdoesnotexistforsureonthissystem" + Date.now());
    }, java.nio.file.attribute.UserPrincipalNotFoundException);

    assert.isTrue(fs.changeGroup(testFile, oldGroup));
    assert.equal(oldGroup, fs.group(testFile));
};


exports.tearDown = function() {
    fs.remove(testFile);
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
