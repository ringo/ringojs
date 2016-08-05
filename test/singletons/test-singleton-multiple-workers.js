const {Worker} = require("ringo/worker");
const {Semaphore} = require("ringo/concurrent");

const assert = require("assert");

var s1 = module.singleton("s1");
var s2 = module.singleton("s2");
var s3 = module.singleton("s3");

exports.testSingleWorker = function() {
    var workerInstance = new Worker(module.id);
    var sem = new Semaphore();

    assert.isUndefined(s1);

    workerInstance.onmessage = function(event) {
        sem.signal();
    };

    workerInstance.postMessage({
        action: "set",
        id: "s1",
        value: 12345
    }, true);

    workerInstance.postMessage({
        action: "set",
        id: "s1",
        value: 67890
    }, true);

    sem.wait(2);

    workerInstance.terminate();
    assert.equal(module.singleton("s1").value, 12345);
};

exports.testMultipleWorkers = function() {
    const muwo = require("./muwo");
    const START = java.lang.System.nanoTime();
    const COUNT = 100;
    var sem = new Semaphore();

    var instances = [];

    for (var i = 0; i < COUNT; i++) {
        let workerInstance = new Worker(module.id);
        instances.push(workerInstance);
        workerInstance.onmessage = function(event) {
            sem.signal();
        };
    }

    assert.isUndefined(s2);
    assert.isUndefined(s3);
    assert.isUndefined(muwo.get("m1"));
    assert.isUndefined(muwo.get("m2"));

    module.singleton("s2", { value: START });
    module.singleton("s3", function() { return START; });
    muwo.set({ value: 12345 }, function() { return 67890; });

    assert.equal(module.singleton("s2").value, START);
    assert.equal(module.singleton("s3"), START);
    assert.equal(muwo.get("m1").value, 12345);
    assert.equal(muwo.get("m2"), 67890);

    for (var r = 0; r < 1000; r++) {
        var workerInstance = instances[Math.floor(COUNT * Math.random())];
        workerInstance.postMessage({
            action: "set",
            id: "s2",
            value: Math.random()
        }, true);
        workerInstance.postMessage({
            action: "set",
            id: "s3",
            function: function() { return Math.random(); }
        }, true);
    }

    sem.wait(1000);

    assert.equal(module.singleton("s2").value, START);
    assert.equal(module.singleton("s3"), START);
    assert.equal(muwo.get("m1").value, 12345);
    assert.equal(muwo.get("m2"), 67890);
};

function onmessage(event) {
    if (event.data.action === "set") {
        // testMultipleWorkers is running ...
        if (event.data.id !== "s1") {
            let muwo = require("./muwo");
            muwo.set({ value: Math.random() }, function() { return Math.random(); });
        }

        if (event.data.value !== undefined) {
            module.singleton(event.data.id, { value: event.data.value });
        } else {
            module.singleton(event.data.id, event.data.function);
        }
    }

    event.source.postMessage(event.data.id);
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}