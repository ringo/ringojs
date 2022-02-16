const assert = require("assert");
const {Worker} = require("ringo/worker");
const {Semaphore} = require("ringo/concurrent");

const TIMEOUT = 1000;

exports.testSetTimeout = function() {
    let value;
    const semaphore = new Semaphore();
    // Spawn worker which will set timeout
    const worker = new Worker(module.resolve("./scheduler_worker"));
    worker.onmessage = function(e) {
        value = e.data;
    };
    worker.postMessage({test: 1, semaphore: semaphore}, true);
    // wait for promises to resolve
    if (!semaphore.tryWait(TIMEOUT)) {
        assert.fail("timed out");
    }
    // make sure promises have resolved via chained callback
    assert.equal(value, "value");
    worker.terminate();
};

exports.testSetInterval = function() {
    let value = 0;
    const semaphore = new Semaphore();
    // Spawn worker which will set interval
    const worker = new Worker(module.resolve("./scheduler_worker"));
    worker.onmessage = function(e) {
        value += e.data;
    };
    worker.postMessage({test: 2, semaphore: semaphore}, true);
    // wait for promises to resolve
    if (!semaphore.tryWait(TIMEOUT, 3)) {
        assert.fail("timed out");
    }
    // make sure promises have resolved via chained callback
    assert.equal(value, 30);
    worker.terminate();
};

// Worker onmessage handler
function onmessage(e) {
    if (e.data.test == 1) {
        setTimeout(function(arg) {
            e.source.postMessage(arg);
            e.data.semaphore.signal();
        }, 1, "value");
    } else {
        setInterval(function(arg) {
            e.source.postMessage(arg);
            e.data.semaphore.signal();
        }, 5, 10);
    }
}

// start the test runner if we're called directly from command line
if (require.main === module) {
    require("system").exit(require('test').run(exports));
}
