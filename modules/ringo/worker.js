/**
 * @fileoverview A Worker API based on the [W3C Web Workers](http://www.w3.org/TR/workers/).
 */
var engine = require("ringo/engine").getRhinoEngine();

export("Worker");

/**
 * A Worker class modeled after the [W3C Web Worker API](http://www.w3.org/TR/workers/).
 *
 * The `Worker` constructor is used to create new Worker threads.
 * If `module` is a module id it must be fully resolved, and the module must
 * define (not export) a `onmessage` function. If `module` is a JavaScript
 * object, it must contain a `onmessage` function property.
 *
 * The worker's `onmessage` function will be called with an event object
 * containing the argument passed to `postMessage` in its `data` property.
 * The event also contains a `source.postMessage` method to post messages
 * back to the original caller.
 *
 * Event listeners for callbacks from the worker can be registered by
 * assigning them to the `onmessage` and `onerror` properties of the worker.
 *
 * @param module the module id or object implementing the onmessage() handler.
 */
function Worker(module) {
    if (!(this instanceof Worker)) {
        return new Worker(module);
    }

    var self = this;
    var worker = engine.getWorker();

    worker.setReloading(false);
    if (typeof module === "string") {
        // Load module immediately and wait till done. This will
        // throw an error if module can't be loaded.
        worker.load(module).get();
    }

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

    /**
     * Post a message to the worker. This method deposits the message
     * in the worker's input queue and returns immediately. The worker's
     * `onmessage` function is called with an event containing the `data`
     * argument and a `source.postMessage` function to return data to the
     * original caller.
     * @param data the data to pass to the worker
     * @param {Boolean} syncCallbacks flag that indicates whether callbacks
     * from the worker should be called synchronously in the worker's own
     * thread rather than in our own local event loop thread. Setting this
     * to true allows us to bypass the event loop and receive callbacks from
     * the worker while running other code.
     */
    this.postMessage = function(data, syncCallbacks) {
        if (!worker) {
            throw new Error("Worker has been terminated");
        }
        var invokeCallback = function(callback, arg) {
            if (syncCallbacks) callback(arg);
            else currentWorker.submit(self, callback, arg);
        }
        var source = {
            postMessage: function(data) {
                invokeCallback(onmessage, {data: data, source: self});
            },
            postError: function(error) {
                invokeCallback(onerror, {data: error, source: self})
            }
        };
        var currentWorker = engine.getCurrentWorker();
        var event = {data: data, source: source};
        worker.submit(self, function() {
            try {
                worker.invoke(module, "onmessage", event);
            } catch (error) {
                invokeCallback(onerror, {data: error, source: self});
            }
        });
    };

    /**
     * Immediately terminate and release the worker thread.
     */
    this.terminate = function() {
        if (worker) {
            worker.terminate();
            engine.releaseWorker(worker);
            worker = null;
        }
    }
}
