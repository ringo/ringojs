exports.testBasics  = require("./test-singleton-basics");
exports.testWorkers = require("./test-singleton-multiple-workers");

if (require.main === module) {
    require("system").exit(require("test").run(exports));
}