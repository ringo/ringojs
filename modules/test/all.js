exports.unittest = require("test/helma/unittest_test");
exports.array = require("test/core/array_test");
exports.object = require("test/core/object_test");
exports.file = require("test/helma/file_test");
exports.skin = require("test/helma/skin_test");
exports.io = require("test/io_test");

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    require("helma/unittest").run(exports);
}