var assert = require("assert");
include("ringo/scheduler");
var {Worker} = require("ringo/worker");
var {Semaphore, TimeUnit} = java.util.concurrent;

exports.testSetTimeout = function() {
    var value;
    var semaphore = new Semaphore(0);
    // Resolve promise in worker so async promise callbacks get called
    var worker = new Worker({
        onmessage: function() {
            setTimeout(function(arg) {
                value = arg;
                semaphore.release();
            }, 1, "value");
        }
    });
    worker.postMessage();
    // wait for promises to resolve
    if (!semaphore.tryAcquire(1000, TimeUnit.MILLISECONDS)) {
        assert.fail("timed out");
    }
    // make sure promises have resolved via chained callback
    assert.equal(value, "value");
    worker.terminate();
};

exports.testSetInterval = function() {
    var value = 0;
    var semaphore = new Semaphore(0);
    // Resolve promise in worker so async promise callbacks get called
    var worker = new Worker({
        onmessage: function() {
            var id = setInterval(function(arg) {
                value += arg;
                semaphore.release();
            }, 1, 10);
        }
    });
    worker.postMessage();
    // wait for promises to resolve
    if (!semaphore.tryAcquire(3, 1000, TimeUnit.MILLISECONDS)) {
        assert.fail("timed out");
    }
    // make sure promises have resolved via chained callback
    assert.equal(value, 30);
    worker.terminate();
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require('test').run(exports));
}
