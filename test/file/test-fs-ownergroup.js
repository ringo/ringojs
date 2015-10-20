var assert = require("assert");
var fs = require("fs");

var testFile = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "ownergroup.txt");

exports.setUp = function() {
    fs.touch(testFile);
};

exports.testOwner = function() {
    assert.equal(fs.owner(testFile), java.lang.System.getProperty("user.name"));
};

exports.testGroup = function() {
    assert.isNotNull(fs.group(testFile));
};

exports.tearDown = function() {
    fs.remove(testFile);
};

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}
