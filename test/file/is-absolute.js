
include('ringo/unittest');
var fs = require('file');

exports.testIsAbsolute = function () {
    assertEqual(true, fs.isAbsolute(fs.absolute(module.path)));
};

if (require.main === module.id) {
    run(exports);
}
