
var engine = require("ringo/engine").getRhinoEngine();

export("Worker");

function Worker(module) {
    if (!(this instanceof Worker)) {
        return new Worker(module);
    }

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
        var worker = engine.getWorker();
        var target = {
            postMessage: function(data) {
                currentWorker.submit(self, onmessage, {data: data, target: self});
            }
        };
        var currentWorker = engine.getCurrentWorker();
        try {
            worker.submit(self, function() {
                try {
                    worker.invoke(module, "onmessage", {data: data, target: target});
                } catch (error) {
                    currentWorker.submit(self, onerror, {data: error, target: self});
                }
            });
        } finally {
            engine.releaseWorker(worker);
        }
    }
}