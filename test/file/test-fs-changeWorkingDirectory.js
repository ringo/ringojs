var assert = require("assert");
var fs = require('fs');

exports.testChangeWorkingDirectory = function () {
    var currentWorkingDirectory = java.lang.System.getProperty("user.dir");
    var tempWorkingDirectory = (java.nio.file.Files.createTempDirectory("ringo-wkdir-test")).toString();

    // change the working directory
    assert.equal(fs.workingDirectory(), currentWorkingDirectory);
    fs.changeWorkingDirectory(tempWorkingDirectory);
    assert.equal(fs.workingDirectory(), tempWorkingDirectory);

    // switch back
    fs.changeWorkingDirectory(currentWorkingDirectory);
    assert.equal(fs.workingDirectory(), currentWorkingDirectory);

    // clean up
    fs.delete(tempWorkingDirectory);
    assert.isFalse(fs.exists(tempWorkingDirectory));
};

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}