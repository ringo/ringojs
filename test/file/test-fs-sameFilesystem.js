var assert = require("assert");
var fs = require("fs");

exports.testSameFilesystem = function() {
    var a = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "test1.txt");
    var b = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "test2.txt");

    assert.isFalse(fs.exists(a));
    assert.isFalse(fs.exists(b));

    fs.touch(a);
    fs.touch(b);

    assert.isTrue(fs.exists(a));
    assert.isTrue(fs.exists(b));

    assert.isTrue(fs.sameFilesystem(a, b));

    fs.remove(a);
    fs.remove(b);

    assert.isFalse(fs.exists(a));
    assert.isFalse(fs.exists(b));
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}