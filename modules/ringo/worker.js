
var engine = require("ringo/engine").getRhinoEngine();
var {Semaphore: JavaSemaphore, TimeUnit} = java.util.concurrent;

export("Worker", "Semaphore");

function Worker(module) {
    if (!(this instanceof Worker)) {
        return new Worker(module);
    }

    var worker;
    var self = this;

    var onmessage = function(e) {
        if (typeof self.onmessage === "function") {
            self.onmessage(e);
        }
    };

    var onerror = function(e) {
        if (typeof self.onerror === "function") {
            self.onerror(e);
        }
    };

    this.postMessage = function(data, syncCallbacks) {
        worker = worker || engine.getWorker();
        var invokeCallback = function(callback, arg) {
            if (syncCallbacks) callback(arg);
            else currentWorker.submit(self, callback, arg);
        }
        var target = {
            postMessage: function(data) {
                invokeCallback(onmessage, {data: data, target: self});
            }
        };
        var currentWorker = engine.getCurrentWorker();
        var event = {data: data, target: target};
        worker.submit(self, function() {
            try {
                worker.invoke(module, "onmessage", event);
            } catch (error) {
                invokeCallback(onerror, {data: error, target: self});
            } finally {
                // fixme - release worker if no pending scheduled tasks;
                // we want to do better than that.
                if (worker.countScheduledTasks() == 0) {
                    engine.releaseWorker(worker);
                    worker = null;
                }
            }
        });
    };

    this.terminate = function() {
        if (worker) {
            worker.terminate();
            engine.releaseWorker(worker);
            worker = null;
        }
    }
}

function Semaphore(permits) {
    if (!(this instanceof Semaphore)) {
        return new Semaphore(permits);
    }

    if (typeof permits === "undefined") permits = 0;
    var s = new JavaSemaphore(permits);

    this.wait = function(permits) {
        if (typeof permits === "undefined") permits = 1;
        s.acquire(permits);
    };

    this.tryWait = function(timeout, permits) {
        if (typeof permits === "undefined") permits = 1;
        return s.tryAcquire(permits, timeout, TimeUnit.MILLISECONDS);
    };

    this.signal = function(permits) {
        if (typeof permits === "undefined") permits = 1;
        s.release(permits);
    };
}