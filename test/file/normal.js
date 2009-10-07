
include('helma/unittest');
var fs = require('file');

var tests = [
    ['', ''],
    ['.', ''],
    ['./', ''],
    ['../', '../'],
    ['../a', '../a'],
    ['../a/', '../a/'],
    ['a/..', ''],
    ['a/../', ''],
    ['a/../b', 'b'],
    ['a/../b/', 'b/'],
];

tests.forEach(function([path, expected]) {
    exports['test "' + path + '"'] = function () {
        var result = fs.normal(path);
        assertEqual(expected, result);
    };
});

if (require.main === module.id) {
    run(exports);
}