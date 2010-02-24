include('ringo/unittest');
include('ringo/buffer');
require('core/string');

var buffer = new Buffer();
const STRING1 = 'foo';
const STRING2 = 'bar';
const STRING3 = 'baz';
const EOL = '\r\n';

exports.setUp = function () buffer.reset();

exports.testWrite = function () {
    buffer.write(STRING1, STRING2);
    assertEqual(STRING1 + STRING2, buffer.toString());
    buffer.write(STRING3);
    assertEqual(STRING1 + STRING2 + STRING3, buffer.toString());
};

exports.testWriteln = function () {
    buffer.writeln(STRING1, STRING2);
    assertEqual(STRING1 + STRING2 + EOL, buffer.toString());
    buffer.writeln(STRING3);
    assertEqual(STRING1 + STRING2 + EOL + STRING3 + EOL, buffer.toString());
};

exports.testForEach = function () {
    var content = ''; // To concatenate buffer content.
    buffer.write(STRING1, STRING2);
    buffer.forEach(function (it) content += it);
    assertEqual(STRING1 + STRING2, content);
};

exports.testDigest = function () {
    buffer.write(STRING1);
    assertEqual(STRING1.digest(), buffer.digest());
};
