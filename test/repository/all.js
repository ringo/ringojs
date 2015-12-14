exports.testZip = require("./zip");
exports.testFile = require("./file");

if (require.main === module) {
    require("test").run(exports);
}
