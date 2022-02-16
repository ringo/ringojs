const assert = require("assert");

const {Worker} = require("ringo/worker");
const {Semaphore} = require("ringo/concurrent");
const {Arrays} = java.util;
const binary = require("binary");

const TIMEOUT = 10000;

exports.testTextMessage = function() {
    const message = "hello world!";
    const worker = new Worker(module.resolve("./websocket_worker"));
    let received = null;
    worker.onmessage = function(event) {
        received = event.data;
    };
    worker.onerror = function(event) {
        console.error(event.data);
    };
    [false, true].forEach(isAsync => {
        const semaphore = new Semaphore();
        received = null;
        worker.postMessage({
            "message": message,
            "semaphore": semaphore,
            "isAsync": isAsync
        }, true);

        if (!semaphore.tryWait(TIMEOUT)) {
            assert.fail("web socket text timed out");
        }
        assert.equal(received, message);
    });
    worker.terminate();
};

exports.testBinaryMessage = function() {
    const message = binary.toByteArray("hello world!");
    const worker = new Worker(module.resolve("./websocket_worker"));
    let received = null;
    worker.onmessage = function(event) {
        received = event.data;
    };
    [false, true].forEach(isAsync => {
        const semaphore = new Semaphore();
        received = null;
        worker.postMessage({
            "message": message.slice(),
            "semaphore": semaphore,
            "isAsync": isAsync
        }, true);

        if (!semaphore.tryWait(TIMEOUT)) {
            assert.fail("web socket binary timed out");
        }
        assert.isTrue(Arrays.equals(received, message));
    });
    worker.terminate();
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
