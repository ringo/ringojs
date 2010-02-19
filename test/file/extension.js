
include('ringo/unittest');
var fs = require('file');

var tests = [
    ['', ''],
    ['.', ''],
    ['..', ''],
    ['.a', ''],
    ['..a', ''],
    ['.a.b', '.b'],
    ['a.b', '.b'],
    ['a.b.c', '.c'],
    ['/', ''],
    ['/.', ''],
    ['/..', ''],
    ['/..a', ''],
    ['/.a.b', '.b'],
    ['/a.b', '.b'],
    ['/a.b.c', '.c'],
    ['foo/', ''],
    ['foo/.', ''],
    ['foo/..', ''],
    ['foo/..a', ''],
    ['foo/.a.b', '.b'],
    ['foo/a.b', '.b'],
    ['foo/a.b.c', '.c'],
    ['/foo/', ''],
    ['/foo/.', ''],
    ['/foo/..', ''],
    ['/foo/..a', ''],
    ['/foo/.a.b', '.b'],
    ['/foo/a.b', '.b'],
    ['/foo/a.b.c', '.c']
];

tests.forEach(function ([path, expected]) {
    exports['test "' + path + '"'] = function () {
        var actual = fs.extension(path);
        assertEqual(expected, actual);
    };
});

if (require.main === module.id) {
    run(exports);
}