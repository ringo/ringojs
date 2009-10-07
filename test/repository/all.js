
exports.zip = require("./zip");
exports.file = require("./file");

if (require.main == module.id) {
    require("helma/unittest").run(exports);
}
