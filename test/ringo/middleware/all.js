exports.testStatic = require("./static_test");

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run(exports));
}
