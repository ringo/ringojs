// Run most tests except for those that take a long time to run,
// consume lots of resources, or mess with global settings

exports.testAssert         = require('./assert');
exports.testAssertCommonJs = require('./assert_commonjs');
exports.testBase64         = require('./ringo/base64_test');
exports.testArgs           = require('./ringo/args_test');
exports.testBuffer         = require('./ringo/buffer_test');
exports.testEncoding       = require('./ringo/encoding_test');
exports.testEvents         = require('./ringo/events_test');
exports.testSkin           = require('./ringo/skin_test');
exports.testPromise        = require('./ringo/promise_test');
exports.testArrays         = require('./ringo/utils/arrays_test');
exports.testFiles          = require('./ringo/utils/files_test');
exports.testObjects        = require('./ringo/utils/objects_test');
exports.testRegexp         = require('./ringo/utils/regexp_test');
exports.testStrings        = require('./ringo/utils/strings_test');
exports.testDates          = require('./ringo/utils/dates_test');
exports.testHttp           = require('./ringo/utils/http_test');
exports.testFilestore      = require('./ringo/storage/filestore_test');
exports.testMemstore       = require('./ringo/storage/memstore_test');
exports.testFile           = require('./file/all');
exports.testBinary         = require('./binary/all');
exports.testRepository     = require('./repository/all');
exports.testIo             = require('./io_test');
exports.testModules        = require('./modules/all');
exports.testMiddleware     = require('./ringo/middleware/all');

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require('test').run(exports));
}
