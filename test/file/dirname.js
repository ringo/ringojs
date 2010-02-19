
include('ringo/unittest');
var fs = require('file');

var tests = [
    ['', '.'],
    ['.', '.'],
    ['foo', '.'],
    //['foo/', '.'],
    ['foo/bar', 'foo']
    // TODO: many more tests
];

tests.forEach(function ([path, expected]) {
    exports['test "' + path + '"'] = function () {
        var actual = fs.dirname(path);
        assertEqual(expected, actual);
    };
});

if (require.main === module.id) {
    run(exports);
}