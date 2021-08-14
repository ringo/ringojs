const system = require("system");

exports.testArchive = require("./archive_test");
exports.testSpecs = require("./specs_test");

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
