/**
 * @fileoverview A Worker API based on the
 * [W3C Web Workers](http://www.w3.org/TR/workers/).
 */
var engine = require("ringo/engine").getRhinoEngine();
var Deferred = require("ringo/promise").Deferred;

exports.Worker = Worker;
exports.WorkerPromise = WorkerPromise;

/**
 * A Worker loosely modeled after the [W3C Web Worker API](http://www.w3.org/TR/workers/).
 * Workers operate on their own set of module instances,  making concurrent
 * behaviour much more predictable than with shared state multithreading.
 *
 * The `module` argument must be the fully resolved id of the module
 * implementing the worker. In order to be able to send messages to the worker
 * using the [postMessage][#Worker.prototype.postMessage] method the module must
 * define (though not necessarily export) a `onmessage` function.
 *
 * Event listeners for callbacks from the worker can be registered by
 * assigning them to the `onmessage` and `onerror` properties of the worker.
 *
 * To free the worker's thread and other resources once the worker is no longer
 * needed its [terminate][#Worker.prototype.terminate] method should be called.
 *
 * @param module the worker module id or object. Must have a `onmessage()` function.
 * @constructor
 */
function Worker(module) {
    if (!(this instanceof Worker)) {
        return new Worker(module);
    }

    var self = this;
    var worker = engine.getWorker();

    // Load module immediately and wait till done. This will
    // throw an error if module can't be loaded.
    worker.loadModuleInWorkerThread(module).get();

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
     * Post a message to the worker. This enqueues the message
     * in the worker's input queue and returns immediately. The worker thread
     * will then pick up the message and pass it to its `onmessage` function.
     *
     * The argument passed to `onmessage` is an object with a `data`
     * property containing the message and a `source` property containing an
     * object with `postMessage` and `postError` methods allowing  the worker
     * to post messages or report errors back to the original caller.
     *
     * If `syncCallbacks` is `true`, callbacks from the worker will run on the
     * worker's own thread instead of our own local event loop thread. This
     * allows callbacks to be delivered concurrently while the local thread is
     * busy doing something else.
     *
     * Note that in contrast to the
     * [Web Workers specification](http://www.w3.org/TR/workers/) this method
     * does not cause the message to be JSON-serialized.
     *
     * @param {Object} data the data to pass to the worker
     * @param {Boolean} [syncCallbacks] flag that indicates whether
     * callbacks from the worker should be called synchronously in the worker's
     * own thread rather than in our own local event loop thread.
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

/**
 * Creates a [Promise][ringo/promise] backed by a [Worker][#Worker].
 *
 * This creates a new Worker with the given `module` and calls its `postMessage`
 * function with the `message` argument. The first message or error received
 * back from the worker will be used to resolve the promise.
 *
 * The worker is terminated immediately after it resolves the promise.
 *
 * @param module the worker module id or object.
 * @param message the message to post to the worker.
 * @constructor
 * @see ringo/promise#Promise
 */
function WorkerPromise(module, message) {
    var deferred = new Deferred();
    var worker = new Worker(module);
    var resolved = false;

    worker.onmessage = function(e) {
        resolve(e.data, false);
    }

    worker.onerror = function(e) {
        resolve(e.data, true);
    };

    function resolve(message, isError) {
        if (!resolved) {
            resolved = true;
            deferred.resolve(e.data, isError);
            worker.terminate();
        }
    }

    worker.postMessage(message);
    return deferred.promise;

    /**
     * Registers callback and errback functions that will be invoked when
     * the promise is resolved by the worker. See documentation for
     * [Promise.then()][ringo/promise#Promise.prototype.then].
     * @name WorkerPromise.prototype.then
     * @param {function} callback called if the promise is resolved as fulfilled
     * @param {function} errback called if the promise is resolved as failed
     * @return {Object} a new promise that resolves to the return value of the
     *     callback or errback when it is called.
     */
}