const {Worker} = require("ringo/worker");
const {Semaphore} = require("ringo/concurrent");

const assert = require("assert");

var s1 = module.singleton("s1");
var s2 = module.singleton("s2");
var s3 = module.singleton("s3");

exports.testComplexSingletonObject = function() {
    const COUNT = 100;
    var sem = new Semaphore();

    var outer = new java.util.concurrent.atomic.AtomicInteger(1000);

    var instances = [];
    for (var i = 0; i < COUNT; i++) {
        let workerInstance = new Worker(module.id);
        instances.push(workerInstance);
        workerInstance.onmessage = function(event) {
            sem.signal();
            outer.decrementAndGet();
        };
    }

    assert.isUndefined(s1);

    module.singleton("s1", {
        a: "b",
        func1: function(a, b) {
            return a + b;
        },
        func2: function() {
            return outer;
        }
    });

    module.singleton("s1", function() { return "never executed."; });

    assert.equal(module.singleton("s1").a, "b");
    assert.equal(typeof module.singleton("s1").func1, "function");
    assert.equal(typeof module.singleton("s1").func2, "function");

    for (var r = 0; r < 1000; r++) {
        var workerInstance = instances[Math.floor(COUNT * Math.random())];
        workerInstance.postMessage({
            id: "s1"
        }, true);
    }

    sem.wait(1000);

    assert.equal(module.singleton("s1").a, "b");
    assert.equal(typeof module.singleton("s1").func1, "function");
    assert.equal(typeof module.singleton("s1").func2, "function");
    assert.equal(module.singleton("s1").func2().get(), 0);
};

exports.testSingletonManipulation = function() {
    // note: this is a behaviour that should be avoided by user!
    // but we won't prevent anyone from doing weird things ...
    assert.isUndefined(s2);
    assert.isUndefined(s3);

    module.singleton("s2", {
        a: "b",
        func: function(a, b) {
            return a + b;
        }
    });

    module.singleton("s3", function() {
        return {
            a: "b",
            func: function() {
                return "Hello World!";
            }
        }
    });

    module.singleton("s2", function() { return "never executed."; });
    module.singleton("s3", function() { return "never executed."; });

    assert.equal(module.singleton("s2").a, "b");
    assert.equal(module.singleton("s3").a, "b");
    assert.equal(typeof module.singleton("s2").func, "function");
    assert.equal(typeof module.singleton("s3").func, "function");

    // real users should treat singletons as read-only in normal use cases,
    // but here we violate that agreement
    module.singleton("s2").a = "c";
    module.singleton("s3").a = "c";
    delete module.singleton("s2").func;
    delete module.singleton("s3").func;

    assert.equal(module.singleton("s2").a, "c");
    assert.equal(module.singleton("s3").a, "c");
    assert.isUndefined(module.singleton("s2").func);
    assert.isUndefined(module.singleton("s3").func);
};

function onmessage(event) {
    var func1 = module.singleton(event.data.id).func1;
    var func2 = module.singleton(event.data.id).func2;

    var one = func1(3, 5);
    var two = func2();

    event.source.postMessage({
        id: event.data.id,
        one: one,
        two: two
    });
}

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}