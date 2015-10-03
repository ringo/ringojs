var assert = require("assert");
var fs = require("fs");

exports.testSymbolicLink = function() {
    var hard = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "hard-" + Date.now()),
        symbolic = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "symlinkk-" + Date.now());

    fs.touch(hard);

    var hardPath = java.nio.file.FileSystems.getDefault().getPath(hard);
    var symPath = java.nio.file.FileSystems.getDefault().getPath(symbolic);
    assert.isTrue(java.nio.file.Files.exists(hardPath));
    assert.isFalse(java.nio.file.Files.isSymbolicLink(hardPath));

    fs.symbolicLink(hard, symbolic);

    assert.isTrue(java.nio.file.Files.exists(hardPath));
    assert.isFalse(java.nio.file.Files.isSymbolicLink(hardPath));
    assert.isTrue(java.nio.file.Files.exists(symPath));
    assert.isTrue(java.nio.file.Files.isSymbolicLink(symPath));

    fs.remove(symbolic);
    fs.remove(hard);
    assert.isFalse(java.nio.file.Files.exists(hardPath));
    assert.isFalse(java.nio.file.Files.exists(symPath));
};

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}