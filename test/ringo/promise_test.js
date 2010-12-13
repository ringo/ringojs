var assert = require("assert");
var {defer, promiseList} = require("ringo/promise");

exports.testPromiseList = function() {
    var d1 = defer(), d2 = defer(), d3 = defer();
    var l = promiseList(d1.promise, d2.promise, d3); // promiseList should convert d3 to promise
    l.then(function(result) {
        assert.deepEqual(result, [{value: "ok"}, {value: 1}, {error: "error"}]);
    }, function(error) {
        assert.fail("promiseList called error callback");
    });
    d2.resolve(1);
    d3.resolve("error", true);
    d1.resolve("ok");
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require('test').run(exports));
}
