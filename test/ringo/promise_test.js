var assert = require("assert");
var {defer, promises} = require("ringo/promise");

exports.testPromiseList = function() {
    var d1 = defer(), d2 = defer(), d3 = defer(), done = defer();
    var l = promises(d1.promise, d2.promise, d3); // promiseList should convert d3 to promise
    l.then(function(result) {
        done.resolve(result);
    }, function(error) {
        done.resolve("promises called error callback", true);
    });
    d2.resolve(1);
    d3.resolve("error", true);
    d1.resolve("ok");
    // make sure promises resolve via wait()
    var result = l.wait();
    assert.deepEqual(result, [{value: "ok"}, {value: 1}, {error: "error"}]);
    // make sure promises resolve via callback
    result = done.promise.wait();
    assert.deepEqual(result, [{value: "ok"}, {value: 1}, {error: "error"}]);
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require('test').run(exports));
}
