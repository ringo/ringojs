var assert = require("assert");

var {Worker} = require("ringo/worker");
var {Semaphore} = require("ringo/concurrent");
var {Arrays} = java.util;

exports.testTextMessage = function() {
    var message = "hello world!";
    var worker = new Worker(module.resolve("./websocket_worker"));
    worker.onmessage = function(event) {
        received = event.data;
    };
    worker.onerror = function(event) {
        console.error(event.data);
    };
    for each (let isAsync in [false, true]) {
        var semaphore = new Semaphore();
        var received = null;
        worker.postMessage({
            "message": message,
            "semaphore": semaphore,
            "isAsync": isAsync
        }, true);

        if (!semaphore.tryWait(2000)) {
            assert.fail("web socket text timed out");
        }
        assert.equal(received, message);
    }
    worker.terminate();
};

exports.testBinaryMessage = function() {
    var message = "hello world!".toByteArray();
    var worker = new Worker(module.resolve("./websocket_worker"));
    worker.onmessage = function(event) {
        received = event.data;
    };
    for each (let isAsync in [false, true]) {
        var semaphore = new Semaphore();
        var received = null;
        worker.postMessage({
            "message": message.slice(),
            "semaphore": semaphore,
            "isAsync": isAsync
        }, true);

        if (!semaphore.tryWait(2000)) {
            assert.fail("web socket binary timed out");
        }
        assert.isTrue(Arrays.equals(received, message));
    }
    worker.terminate();
};