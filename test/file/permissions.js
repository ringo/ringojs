var assert = require("assert");
var fs = require("fs");

/**
 * Ringo itself requires only Java 7, but this test relies on the
 * PosixFilePermissions.toString() method introduced in Java 8.
 * This is necessary since permissions are returned as a set.
 */
var requireJava8 = function() {
    if (java.lang.System.getProperty("java.version").indexOf("1.7") === 0) {
        assert.fail("Java 8 or higher is required to run permission tests.");
    }
};

var permissionString = function(permissionSet) {
    return java.nio.file.attribute.PosixFilePermissions.toString(permissionSet);
};

exports.testDirectoryPermissions = function() {
    requireJava8();

    var path = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "mkdirpermissions" + Date.now());

    assert.isFalse(fs.exists(path));

    try {
        // prepare test
        fs.makeDirectory(path, 0555);
        var nioPath = java.nio.file.Paths.get(path);

        // test permissions
        assert.isTrue(java.nio.file.Files.exists(nioPath));
        assert.isTrue(java.nio.file.Files.isDirectory(nioPath));
        assert.equal("r-xr-xr-x", permissionString(java.nio.file.Files.getPosixFilePermissions(nioPath)));

        // change permissions
        fs.changePermissions(path, 0000);
        assert.equal("---------", permissionString(java.nio.file.Files.getPosixFilePermissions(nioPath)));

        // change permissions
        fs.changePermissions(path, 0700);
        assert.equal("rwx------", permissionString(java.nio.file.Files.getPosixFilePermissions(nioPath)));

        // clean up
        fs.removeDirectory(path);
        assert.isFalse(java.nio.file.Files.exists(nioPath));
    } catch (err) {
        assert.fail("Could not create directory " + path + " " + err);
    }
};

exports.testFilePermissions = function() {
    requireJava8();

    var path = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "tmpfile" + Date.now());

    assert.isFalse(fs.exists(path));

    try {
        // prepare test
        fs.touch(path);
        var nioPath = java.nio.file.Paths.get(path);

        // test permissions
        assert.isTrue(java.nio.file.Files.exists(nioPath));
        assert.isFalse(java.nio.file.Files.isDirectory(nioPath));
        fs.changePermissions(path, 0555);
        assert.equal("r-xr-xr-x", permissionString(java.nio.file.Files.getPosixFilePermissions(nioPath)));

        // change permissions
        fs.changePermissions(path, 0000);
        assert.equal("---------", permissionString(java.nio.file.Files.getPosixFilePermissions(nioPath)));

        // change permissions
        fs.changePermissions(path, 0700);
        assert.equal("rwx------", permissionString(java.nio.file.Files.getPosixFilePermissions(nioPath)));

        // clean up
        fs.removeDirectory(path);
        assert.isFalse(java.nio.file.Files.exists(nioPath));
    } catch (err) {
        assert.fail("Could not create directory " + path + " " + err);
    }
};


if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}