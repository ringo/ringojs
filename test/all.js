// Run complete RingoJS test suite.
exports.testAssert         = require('./assert');
exports.testAssertCommonJs = require('./assert_commonjs');
exports.testArgs           = require('./ringo/args_test');
exports.testBase64         = require('./ringo/base64_test');
exports.testBuffer         = require('./ringo/buffer_test');
exports.testEncoding       = require('./ringo/encoding_test');
exports.testEvents         = require('./ringo/events_test');
exports.testEventSource    = require('./ringo/eventsource_test');
exports.testHttpClient     = require('./ringo/httpclient_test');
exports.testHttpServer     = require('./ringo/httpserver_test');
exports.testJsgi           = require('./ringo/jsgi/all');
exports.testPromise        = require('./ringo/promise_test');
exports.testScheduler      = require('./ringo/scheduler_test');
exports.testWebSocket      = require('./ringo/websocket_test');
exports.testUtils          = require('./ringo/utils/all');
exports.testFile           = require('./file/all');
exports.testBinary         = require('./binary/all');
exports.testRepository     = require('./repository/all');
exports.testIo             = require('./io_test');
exports.testModules        = require('./modules/all');

// Also include integration tests
exports.testIntegration    = require('./integration-tests/all');

// start the test runner if we're called directly from command line
if (require.main === module) {
    require('system').exit(require('test').run(exports));
}
