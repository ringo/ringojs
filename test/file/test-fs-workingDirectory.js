var assert = require("assert");
var fs = require('fs');

const SEPARATOR = require("ringo/utils/files").separator;

exports.testChangeWorkingDirectory = function () {
    var currentWorkingDirectory = java.lang.System.getProperty("user.dir") + SEPARATOR;
    var tempWorkingDirectory = java.nio.file.Files.createTempDirectory("ringo-wkdir-test") + SEPARATOR;

    // change the working directory
    assert.equal(fs.workingDirectory(), currentWorkingDirectory);

    assert.throws(function() {
        fs.changeWorkingDirectory(tempWorkingDirectory);
    });

    // clean up
    fs.removeTree(tempWorkingDirectory);
    assert.isFalse(fs.exists(tempWorkingDirectory));
};

exports.testDirectory = function() {
    assert.equal(fs.workingDirectory(), java.lang.System.getProperty("user.dir") + SEPARATOR);
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}