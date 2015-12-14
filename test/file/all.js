exports.test_copy = require("./test-fs-copy");
exports.test_dirname = require("./test-fs-dirname");
exports.test_extension = require("./test-fs-extension");
exports.test_isAbsolute = require("./test-fs-isAbsolute");
exports.test_iterator = require("./test-fs-iterator");
exports.test_join = require("./test-fs-join");
exports.test_links = require("./test-fs-links");
exports.test_mkdir = require("./test-fs-mkdir");
exports.test_move = require("./test-fs-move");
exports.test_normal = require("./test-fs-normal");
exports.test_open = require("./test-fs-open");
exports.test_ownergroup = require("./test-fs-ownergroup");
exports.test_permissions = require("./test-fs-permissions");
exports.test_relative = require("./test-fs-relative");
exports.test_resolve = require("./test-fs-resolve");
exports.test_sameFilesystem = require("./test-fs-sameFilesystem");
exports.test_touch = require("./test-fs-touch");
exports.test_workingDirectory = require("./test-fs-workingDirectory");

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}