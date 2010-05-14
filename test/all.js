exports.unittest = require('./ringo/unittest_test');
exports.base64 = require('./ringo/base64_test');
exports.args = require('./ringo/args_test');
exports.array = require('./core/array_test');
exports.buffer = require('./ringo/buffer_test');
exports.object = require('./core/object_test');
exports.encoding = require('./ringo/encoding_test');
exports.fileutils = require('./ringo/fileutils_test');
exports.skin = require('./ringo/skin_test');
exports.string = require('./core/string_test');
exports.utils = require('./ringo/utils_test');
exports.filestore = require('./ringo/storage/filestore_test');
exports.memstore = require('./ringo/storage/memstore_test');
exports.file = require('./file/all');
exports.binary = require('./binary/all');
exports.repository = require('./repository/all');
exports.io = require('./io_test');
exports.modules = require('./modules/all');

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    require('ringo/unittest').run(exports);
}
