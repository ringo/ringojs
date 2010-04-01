include('ringo/unittest');
var changeMe = require('namespace/skeleton');

exports.testSomething = function () {
    assertTrue(true);
};

if (require.main == module.id) {
    require('ringo/unittest').run(exports);
}
