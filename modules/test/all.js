exports.unittest = require("./helma/unittest_test");
exports.array = require("./core/array_test");
exports.object = require("./core/object_test");
exports.file = require("./helma/file_test");
exports.skin = require("./helma/skin_test");
exports.io = require("./io_test");

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    require("helma/unittest").run(exports);
}
