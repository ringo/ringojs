exports.testZip = require("./zip");
exports.testFile = require("./file");

if (require.main == module.id) {
    require("ringo/unittest").run(exports);
}
