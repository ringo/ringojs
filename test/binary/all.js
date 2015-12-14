exports.testBytearray = require('./bytearray-tests');
exports.testBytearrayEncodings = require('./bytearray-encodings-tests');
exports.testBytestring = require('./bytestring-tests');
exports.testBytestringEncodings = require('./bytestring-encodings-tests');
exports.testBytearraySlice = require('./bytearray-slice');

if (require.main === module) {
    require('system').exit(require('test').run(module.id));
}