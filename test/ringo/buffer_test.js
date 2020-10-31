const assert = require("assert");
const {Buffer} = require('ringo/buffer');
const digest = require('ringo/utils/strings').digest;

const buffer = new Buffer();
const STRING1 = 'foo';
const STRING2 = 'bar';
const STRING3 = 'baz';
const EOL = '\r\n';

exports.setUp = function () {
    buffer.reset();
};

exports.testWrite = function () {
    buffer.write(STRING1, STRING2);
    assert.strictEqual(STRING1 + STRING2, buffer.toString());
    buffer.write(STRING3);
    assert.strictEqual(STRING1 + STRING2 + STRING3, buffer.toString());
};

exports.testWriteln = function () {
    buffer.writeln(STRING1, STRING2);
    assert.strictEqual(STRING1 + STRING2 + EOL, buffer.toString());
    buffer.writeln(STRING3);
    assert.strictEqual(STRING1 + STRING2 + EOL + STRING3 + EOL, buffer.toString());
};

exports.testForEach = function () {
    let content = ''; // To concatenate buffer content.
    buffer.write(STRING1, STRING2);
    buffer.forEach(it => content += it);
    assert.strictEqual(STRING1 + STRING2, content);
};

exports.testDigest = function () {
    buffer.write(STRING1);
    assert.strictEqual(digest(STRING1), buffer.digest());
};

exports.testLength = function() {
    let expectedLength = 0;
    assert.strictEqual(expectedLength, buffer.length);
    buffer.write(STRING1, STRING2);
    expectedLength = STRING1.length + STRING2.length;
    assert.strictEqual(expectedLength, buffer.length);
    buffer.writeln(STRING3);
    expectedLength += STRING3.length + EOL.length;
    assert.strictEqual(expectedLength, buffer.length);
    assert.strictEqual(expectedLength, buffer.toString().length);
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
