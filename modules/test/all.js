exports.unittest = require("test/helma/unittest_test");
exports.array = require("test/core/array_test");
exports.object = require("test/core/object_test");
exports.file = require("test/helma/file_test");
exports.skin = require("test/helma/skin_test");
exports.narwhal = require("test/narwhal/io_test");

// start the test runner if we're called directly from command line
if (__name__ == "__main__") {
    require("helma/unittest").run(exports);
}