var assert = require("assert");
var files = require('ringo/utils/files');
var fs = require('fs');

const PARENT = '/home/ringo/';
const CHILD = 'Projects';
const RELATIVE_CHILD = './' + CHILD;
const FOO = 'foo';

exports.testResolveUri = function () {
    // Should work the same for both normal and relative child notations.
    assert.strictEqual(PARENT + CHILD, files.resolveUri(PARENT, CHILD));
    assert.strictEqual(PARENT + CHILD, files.resolveUri(PARENT, RELATIVE_CHILD));
    assert.strictEqual(PARENT + FOO, files.resolveUri(PARENT, CHILD, FOO));
    assert.strictEqual(PARENT + FOO, files.resolveUri(PARENT, RELATIVE_CHILD, FOO));
    // but ignore parent if child starts with "/"
    assert.strictEqual(PARENT, files.resolveUri(PARENT, PARENT));
};

exports.testResolveId = function () {
    // Parent is ignored unless child starts with "./" or "../"
    assert.strictEqual(CHILD, files.resolveId(PARENT, CHILD));
    assert.strictEqual(PARENT + CHILD, files.resolveId(PARENT, RELATIVE_CHILD));
    assert.strictEqual(PARENT, files.resolveId(PARENT, PARENT));
};

exports.testCreateTempFile = function () {
    var tempFile = files.createTempFile('ringo');
    assert.isNotNull(tempFile); // Creation w/ prefix only.
    assert.isTrue(/[\/\\]ringo\w*\.tmp$/.test(tempFile));
    fs.remove(tempFile);
    tempFile = files.createTempFile('ringo', '.js');
    assert.isNotNull(tempFile); // Creation incl. suffix.
    assert.isTrue(/[\/\\]ringo\w*\.js$/.test(tempFile));
    fs.remove(tempFile);
    assert.throws(function () files.createTempFile('ri'), java.lang.
            IllegalArgumentException); // Prefix must be at least 3 chars long.
};

exports.testPosixPermissions = function() {
    if (!java.nio.file.FileSystems.getDefault().supportedFileAttributeViews().contains("posix")) {
        return;
    }

    var permissions = new files.PosixPermissions(0777);
    assert.strictEqual(0777, permissions.value);

    permissions.value = 0;
    assert.strictEqual(0, permissions.value);

    assert.throws(function () {
       permissions.value = 1000;
    });

    var tempPath = java.nio.file.Files.createTempFile(new java.lang.String("ringotest" + Math.random() + Date.now()), null);
    var permissionAttributes = java.nio.file.Files.getPosixFilePermissions(tempPath);

    permissions = new files.PosixPermissions(permissionAttributes);

    assert.strictEqual(
        "[PosixPermissions " + java.nio.file.attribute.PosixFilePermissions.toString(permissionAttributes) + "]",
        permissions.toString()
    );

    java.nio.file.Files.delete(tempPath);
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}