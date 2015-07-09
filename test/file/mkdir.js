var assert = require("assert");
var fs = require("fs");

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

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}