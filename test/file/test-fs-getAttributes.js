const assert = require("assert");
const fs = require("fs");

exports.testGetAttributes = function () {
    const jha = fs.path(java.lang.System.getProperty("java.home")).getAttributes();
    assert.deepEqual(jha, fs.getAttributes(java.lang.System.getProperty("java.home")));
    assert.isTrue(jha.creationTime instanceof Date);
    assert.isTrue(jha.lastAccessTime instanceof Date);
    assert.isTrue(jha.lastModifiedTime instanceof Date);
    assert.isTrue(jha.isDirectory);
    assert.isFalse(jha.isRegularFile);
    assert.isFalse(jha.isOther);
    assert.isTrue(typeof jha.isSymbolicLink === "boolean");
    assert.isTrue(Number.isInteger(jha.size));
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
