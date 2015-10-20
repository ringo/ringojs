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

exports.testChangeOwner = function() {
    assert.isNotNull(fs.changeOwner(testFile, java.lang.System.getProperty("user.name")));
    assert.equal(fs.owner(testFile), java.lang.System.getProperty("user.name"));

    assert.throws(function() {
        fs.changeOwner(testFile, "thisuserdoesnotexistforsureonthissystem" + Date.now());
    }, java.nio.file.attribute.UserPrincipalNotFoundException);
    assert.equal(fs.owner(testFile), java.lang.System.getProperty("user.name"));
};

exports.testChangeGroup = function() {
    var oldGroup = fs.group(testFile);

    assert.throws(function() {
        fs.changeGroup(testFile, "thisgroupdoesnotexistforsureonthissystem" + Date.now());
    }, java.nio.file.attribute.UserPrincipalNotFoundException);

    assert.isTrue(fs.changeGroup(testFile, oldGroup));
    assert.equal(oldGroup, fs.group(testFile));
};


exports.tearDown = function() {
    fs.remove(testFile);
};

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}
