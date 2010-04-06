
include('ringo/unittest');
var fs = require('fs');

exports.testIsAbsolute = function () {
    assertEqual(true, fs.isAbsolute(fs.absolute(module.path)));
};

if (require.main === module.id) {
    run(exports);
}
