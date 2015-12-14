var assert = require("assert");
var fs = require("fs");
var {ByteArray} = require("binary");

var Files = java.nio.file.Files,
    Paths = java.nio.file.Paths;

exports.testMove = function() {
    var testFile = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "movetest-" + Date.now());
    var movedTestFile = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "movetest-2-" + Date.now());

    assert.isFalse(Files.exists(Paths.get(testFile)));

    var stream = fs.open(testFile, "wb");
    var ba = new ByteArray([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

    try {
        stream.write(ba);
        stream.flush();
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }

    // overwrite the file
    fs.move(testFile, movedTestFile);

    assert.isFalse(Files.exists(Paths.get(testFile)));
    assert.isTrue(Files.exists(Paths.get(movedTestFile)));

    stream = fs.open(movedTestFile, "rb");
    try {
        var buff = new ByteArray(10);
        assert.equal(stream.readInto(buff), 10);

        // Check the content
        for (var i = 0; i < buff.length; i++) {
            assert.equal(buff.charCodeAt(i), ba.charCodeAt(i));
        }
    } finally {
        stream.close();
        assert.isTrue(stream.closed());
    }

    fs.remove(movedTestFile);
    assert.isFalse(Files.exists(Paths.get(movedTestFile)));
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}