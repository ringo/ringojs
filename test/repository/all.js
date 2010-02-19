
exports.zip = require("./zip");
exports.file = require("./file");

if (require.main == module.id) {
    require("ringo/unittest").run(exports);
}
