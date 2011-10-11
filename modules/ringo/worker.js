
var engine = require("ringo/engine").getRhinoEngine();

export("Worker");

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

    this.postMessage = function(data) {
        worker = worker || engine.getWorker();
        var target = {
            postMessage: function(data) {
                currentWorker.submit(self, onmessage, {data: data, target: self});
            }
        };
        var currentWorker = engine.getCurrentWorker();
        worker.submit(self, function() {
            try {
                worker.invoke(module, "onmessage", {data: data, target: target});
            } catch (error) {
                currentWorker.submit(self, onerror, {data: error, target: self});
            } finally {
                // fixme - release worker if no pending scheduled tasks
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