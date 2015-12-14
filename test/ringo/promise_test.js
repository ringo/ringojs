var assert = require("assert");
var {Deferred, PromiseList} = require("ringo/promise");
var {WorkerPromise} = require("ringo/worker");
var system = require("system");

exports.testPromise = function() {
    var d1 = new Deferred(), d2 = new Deferred();
    var v1, v2, e2;
    d1.promise.then(function(value) {
        v1 = value;
    });
    d2.promise.then(function(value) {
        v2 = value;
    }, function(error) {
        e2 = error;
    });

    d1.resolve("value");
    d2.resolve("error", true);

    // make sure promises have resolved via chained callback
    assert.equal(v1, "value");
    assert.equal(v2, undefined);
    assert.equal(e2, "error");
};

exports.testPromiseList = function() {
    var d1 = Deferred(), d2 = Deferred(), d3 = Deferred(), done = Deferred();
    var l = PromiseList(d1.promise, d2.promise, d3); // PromiseList should convert d3 to promise
    var result;
    l.then(function(value) {
        done.resolve(value);
    }, function(error) {
        done.resolve("promises called error callback", true);
    });
    done.promise.then(function(value) {
        result = value;
    });
    d2.resolve(1);
    d3.resolve("error", true);
    d1.resolve("ok");
    // make sure promises have resolved via chained callback
    assert.deepEqual(result, [{value: "ok"}, {value: 1}, {error: "error"}]);
};

exports.testPromiseListWait = function() {
    var w1 = new WorkerPromise( module.resolve('./promise_worker'), { delay: 100 }, true );
    var w2 = new WorkerPromise( module.resolve('./promise_worker'), { delay: 100 }, true );
    var l = PromiseList(w1, w2);

    var then = new Date().getTime();
    var result = l.wait(1000);
    var elapsed = new Date().getTime() - then;

    // The workers should finish in 100ms, therefore the PromiseList should end at
    // about the same time. If a second has passed, the PromiseList is not properly
    // being notified of the Workers who are ending.
    assert.isTrue(elapsed < 500);
    assert.deepEqual(result, [{value: {success: true}}, {value: {success: true}}]);
};

exports.testPromiseListAsArray = function() {
    var d1 = Deferred(), d2 = Deferred(), d3 = Deferred(), done = Deferred();
    var l = PromiseList([d1.promise, d2.promise, d3]); // PromiseList should convert d3 to promise
    var result;
    l.then(function(value) {
        done.resolve(value);
    }, function(error) {
        done.resolve("promises called error callback", true);
    });
    done.promise.then(function(value) {
        result = value;
    });
    d2.resolve(1);
    d3.resolve("error", true);
    d1.resolve("ok");
    // make sure promises have resolved via chained callback
    assert.deepEqual(result, [{value: "ok"}, {value: 1}, {error: "error"}]);
};

exports.testPromiseMultipleCallbacks = function() {
    var d = new Deferred();
    var v1, v2;
    d.promise.then(function(value) {
        return value + 2;
    }).then(function(value) {
        v1 = value + 5;
    });
    d.promise.then(function(value) {
        return value + 2;
    }).then(function(value) {
         v2 = value + 10;
    });
    d.resolve(10);
    assert.equal(v1, 17);
    assert.equal(v2, 22);
};

exports.testPromiseChain = function() {
    var d1 = new Deferred(), d2 = new Deferred();
    var v1, v2, v3;
    d1.promise.then(function(value) {
        v1 = value;
        return v1;
    }).then(function(value) {
        v2 = value + 1;
        d2.resolve(v2);
        return d2.promise;
    }).then(function(value) {
        v3 = value + 1;
    });
    d1.resolve(1);
    assert.equal(v1, 1);
    assert.equal(v2, 2);
    assert.equal(v3, 3);
};

exports.testPromiseChainFail = function() {
    var d = new Deferred();
    var v1, v2, v3, err;
    d.promise.then(function(value) {
        v1 = value;
        throw 'error';
    }).then(function(value) {
        v2 = value + 1;
        return v2;
    }).then(function(value) {
        v3 = value + 1;
    }, function(error) {
        err = error;
    });
    d.resolve(1);
    assert.equal(v1, 1);
    assert.equal(v2, undefined);
    assert.equal(v3, undefined);
    assert.equal(err, 'error');
};

// start the test runner if we're called directly from command line
if (require.main === module) {
    system.exit(require('test').run(exports));
}
