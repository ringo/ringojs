const assert = require("assert");
const system = require("system");
const {Worker} = require("ringo/worker");
const {Semaphore} = require("ringo/concurrent");

exports.testPostMessage = () => {
    const worker = new Worker(module.resolve("./worker"));
    const semaphore = new Semaphore();
    const payload = {"one": 1, "two": null};
    let received = null;
    try {
        worker.onmessage = (event) => {
            received = event.data;
            semaphore.signal();
        };
        worker.onerror = (event) => {
            received = event.data;
            semaphore.signal();
        };

        // postMessage
        worker.postMessage({
            "method": "postMessage",
            "payload": payload
        }, true);
        assert.isTrue(semaphore.tryWait(100));
        assert.deepEqual(received, payload);

        // postError
        worker.postMessage({
            "method": "postError",
            "payload": payload
        }, true);
        assert.isTrue(semaphore.tryWait(100));
        assert.deepEqual(received, payload);

        // errors thrown by worker must be received in onerror callback
        worker.postMessage({
            "method": "throwError"
        }, true);
        assert.isTrue(semaphore.tryWait(100));
        assert.isTrue(received instanceof Error);
        assert.strictEqual(received.message, "Error thrown in worker");

        // errors thrown by worker in setTimeout
        worker.postMessage({
            "method": "timeoutError"
        }, true);
        assert.isTrue(semaphore.tryWait(100));
        assert.isTrue(received instanceof Error);
        assert.strictEqual(received.message, "Error thrown in worker timeout");
    } finally {
        worker.terminate();
    }
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
