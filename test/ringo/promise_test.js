var assert = require("assert");
var {defer, promises} = require("ringo/promise");
var {Worker} = require("ringo/worker");
var semaphore = new java.util.concurrent.Semaphore(0);

exports.testPromiseList = function() {
    var d1 = defer(), d2 = defer(), d3 = defer(), done = defer();
    var l = promises(d1.promise, d2.promise, d3); // promiseList should convert d3 to promise
    var result;
    l.then(function(value) {
        done.resolve(value);
    }, function(error) {
        done.resolve("promises called error callback", true);
    });
    done.promise.then(function(value) {
        result = value;
        semaphore.release();
    });
    // Resolve promise in worker so async promise callbacks get called
    var worker = new Worker({
        onmessage: function() {
            d2.resolve(1);
            d3.resolve("error", true);
            d1.resolve("ok");
        }
    }).postMessage();
    // wait for last promise to resolve
    semaphore.acquire();
    // make sure promises have resolved via chained callback
    assert.deepEqual(result, [{value: "ok"}, {value: 1}, {error: "error"}]);
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require('test').run(exports));
}
