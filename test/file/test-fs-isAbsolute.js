var assert = require("assert");
var fs = require('fs');

exports.testIsAbsolute = function () {
    assert.isTrue(fs.isAbsolute(java.lang.System.getProperty("java.home")));
    assert.isTrue(fs.isAbsolute(fs.absolute(module.path)));
    assert.isTrue(fs.isRelative("./"));
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}