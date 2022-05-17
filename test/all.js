require("ringo/logging").setConfig(getResource("./log4j2.properties"));

// Run complete RingoJS test suite.
exports.testAssert         = require('./assert');
exports.testAssertCommonJs = require('./assert_commonjs');
exports.testArgs           = require('./ringo/args_test');
exports.testBase64         = require('./ringo/base64_test');
exports.testBuffer         = require('./ringo/buffer_test');
exports.testConcurrent     = require('./ringo/concurrent_test');
exports.testEncoding       = require('./ringo/encoding_test');
exports.testEvents         = require('./ringo/events_test');
exports.testHttpClient     = require('./ringo/httpclient_test');
exports.testHttpServer     = require('./ringo/httpserver/all');
exports.testJsgi           = require('./ringo/jsgi/all');
exports.testLogging        = require('./ringo/logging_test');
exports.testNet            = require('./net_test');
exports.testPromise        = require('./ringo/promise_test');
exports.testScheduler      = require('./ringo/scheduler_test');
exports.testSubProcess     = require('./ringo/subprocess_test');
exports.testWorker         = require('./ringo/worker/worker_test');
exports.testZip            = require('./ringo/zip_test');
exports.testUtils          = require('./ringo/utils/all');
exports.testFile           = require('./file/all');
exports.testBinary         = require('./binary/all');
exports.testRepository     = require('./repository/all');
exports.testIo             = require('./io_test');
exports.testModules        = require('./modules/all');
exports.testRhino          = require("./rhino/all");
exports.testSystem         = require('./system_test');

// Also include integration tests.
exports.testIntegration    = require('./integration-tests/all');

// start the test runner if we're called directly from command line
if (require.main === module) {
    require('system').exit(require('test').run(exports));
}
