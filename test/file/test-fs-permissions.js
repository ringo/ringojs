importPackage(java.nio.file);
importPackage(java.nio.file.attribute);

var fs = require("fs");
var assert = require("assert");
var log = require("ringo/logging").getLogger(module.id);

var permissionString = function(permissionSet) {
    return PosixFilePermissions.toString(permissionSet);
};

var supportsPosix = FileSystems.getDefault().supportedFileAttributeViews().contains("posix");

exports.testDirectoryPermissions = function() {
    if (!supportsPosix) {
        log.info("Skipping test, PosixFileAttributeView not supported");
        return;
    }

    var path = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "mkdirpermissions" + Date.now());

    assert.isFalse(fs.exists(path));

    try {
        // prepare test
        fs.makeDirectory(path, 0555);
        var nioPath = Paths.get(path);

        // test permissions
        assert.isTrue(Files.exists(nioPath));
        assert.isTrue(Files.isDirectory(nioPath));
        assert.equal(permissionString(Files.getPosixFilePermissions(nioPath)), "r-xr-xr-x");
        assert.equal(fs.permissions(path).toString(), "[PosixPermissions r-xr-xr-x]");

        // change permissions
        fs.changePermissions(path, 0000);
        assert.equal(permissionString(Files.getPosixFilePermissions(nioPath)), "---------");
        assert.equal(fs.permissions(path).toString(), "[PosixPermissions ---------]");

        // change permissions
        fs.changePermissions(path, 0700);
        assert.equal(permissionString(Files.getPosixFilePermissions(nioPath)), "rwx------");
        assert.equal(fs.permissions(path).toString(), "[PosixPermissions rwx------]");

        // clean up
        fs.removeDirectory(path);
        assert.isFalse(Files.exists(nioPath));
    } catch (err) {
        assert.fail("Could not create directory " + path + " " + err);
    }
};

exports.testFilePermissions = function() {
    if (!supportsPosix) {
        log.info("Skipping test, PosixFileAttributeView not supported");
        return;
    }

    var path = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "tmpfile" + Date.now());

    assert.isFalse(fs.exists(path));

    try {
        // prepare test
        fs.touch(path);
        var nioPath = Paths.get(path);

        // test permissions
        assert.isTrue(Files.exists(nioPath));
        assert.isFalse(Files.isDirectory(nioPath));
        fs.changePermissions(path, 0555);
        assert.equal("r-xr-xr-x", permissionString(Files.getPosixFilePermissions(nioPath)));

        // change permissions
        fs.changePermissions(path, 0000);
        assert.equal("---------", permissionString(Files.getPosixFilePermissions(nioPath)));

        // change permissions
        fs.changePermissions(path, 0700);
        assert.equal("rwx------", permissionString(Files.getPosixFilePermissions(nioPath)));

        // clean up
        fs.removeDirectory(path);
        assert.isFalse(Files.exists(nioPath));
    } catch (err) {
        assert.fail("Could not create directory " + path + " " + err);
    }
};


if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}