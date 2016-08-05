exports.testBasics  = require("./test-singleton-basics");
exports.testWorkers = require("./test-singleton-multiple-workers");
exports.testComplexObject = require("./test-singleton-complex-object");

if (require.main === module) {
    require("system").exit(require("test").run(exports));
}