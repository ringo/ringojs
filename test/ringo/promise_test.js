var assert = require("assert");
var {defer, promises} = require("ringo/promise");
var {Worker} = require("ringo/worker");

exports.testPromise = function() {
    var d1 = defer(), d2 = defer();
    var semaphore = new java.util.concurrent.Semaphore(0);
    var v1, v2, e2;
    d1.promise.then(function(value) {
        v1 = value;
        semaphore.release();
    });
    d2.promise.then(function(value) {
        v2 = value;
    }, function(error) {
        e2 = error;
        semaphore.release();
    });
    // Resolve promise in worker so async promise callbacks get called
    new Worker({
        onmessage: function() {
            d1.resolve("value");
            d2.resolve("error", true);
        }
    }).postMessage();
    // wait for promises to resolve
    semaphore.acquire(2);
    // make sure promises have resolved via chained callback
    assert.equal(v1, "value");
    assert.equal(v2, undefined);
    assert.equal(e2, "error");
};

exports.testPromiseList = function() {
    var d1 = defer(), d2 = defer(), d3 = defer(), done = defer();
    var l = promises(d1.promise, d2.promise, d3); // promiseList should convert d3 to promise
    var semaphore = new java.util.concurrent.Semaphore(0);
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
    new Worker({
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
