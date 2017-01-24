exports.testAsyncResponse  = require('./asyncresponse_test');
exports.testResponse       = require('./response_test');
exports.testResponseRange       = require('./response_range_test');

if (require.main === module) {
    require("system").exit(require("test").run(exports));
}
