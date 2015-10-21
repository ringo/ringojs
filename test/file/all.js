exports.testChangeWorkingDirectory = require("./test-fs-changeWorkingDirectory");
exports.testDirname = require("./test-fs-dirname");
exports.testExtension = require("./test-fs-extension");
exports.testIsAbsolute = require("./test-fs-isAbsolute");
exports.testIterator = require("./test-fs-iterator");
exports.testLinks = require("./test-fs-links");
exports.testMkdir = require("./test-fs-mkdir");
exports.testNormal = require("./test-fs-normal");
exports.testOpen = require("./test-fs-open");
exports.testPermissions = require("./test-fs-permissions");
exports.testRelative = require("./test-fs-relative");
exports.testResolve = require("./test-fs-resolve");
exports.testSameFilesystem = require("./test-fs-sameFilesystem");
exports.testTouch = require("./test-fs-touch");
exports.testOwnerGroup = require("./test-fs-ownergroup");

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}