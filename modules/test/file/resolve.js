
include('helma/unittest');
var fs = require('file');

var tests = [
    [['/'], '/'],
    [['/a'], '/a'],
    [['/a/'], '/a/'], 
    [['/a', '/b'], '/b'], 
    [['/a', '/b/'], '/b/'], 
    [['/', 'a'], '/a'],
    [['/', 'a/'], '/a/'],
    [['/a', 'a'], '/a'],
    [['/a', 'a/'], '/a/'],
    [['/a/', 'a'], '/a/a'],
    [['/a/', 'a/'], '/a/a/'],
    [['..'], '../'],
    [['..', 'a'], '../a'],
    [['..', 'a/'], '../a/'],
    [['.'], ''],
    [['.', 'a'], 'a'],
    [['.', 'a/'], 'a/'],
    [['a', '.'], ''],
    [['a', '.', 'a'], 'a'],
    [['a', '.', 'a/'], 'a/'],
    [['a', '..'], '../'],
    [['a', '..', 'a'], '../a'],
    [['a', '..', 'a/'], '../a/'],
    [['a/', '..'], ''],
    [['a/', '..', 'a'], 'a'],
    [['a/', '..', 'a/'], 'a/'],
    [['a/b', ''], 'a/b'],
];

tests.forEach(function([parts, expected]) {
    exports['test ' + parts.toSource()] = function () {
        var result = fs.resolve.apply(null, parts);
        assertEqual(expected, result);
    };
});

if (require.main === module.id) {
    run(exports);
}
