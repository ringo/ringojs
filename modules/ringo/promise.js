/**
 * @fileOverview Allows to work with deferred values that will be resolved in the future.
 */

export("defer");

var NEW = 0;
var FULFILLED = 1;
var FAILED = 2;

/**
 * Returns an object of type `Deferred` representing a deferred value. 
 * The deferred is a JavaScript object with two properties: a `Promise` object and a resolve function.
 *
 * The promise object can be used to [register a callback][#deferred.promise.then] to be invoked when
 * the promise is eventually resolved, or [wait for the promise to be resolved][#deferred.promise.wait].
 *
 * The [resolve][#deferred.resolve] function is used to resolve the promise as either fulfilled or failed.
 *
 * @example
 * // Example for an asynchronous JSGI response.
 * // The response is generated after a one second delay.
 * exports.asyncAction = function(request) {
 *   var response = defer();
 *   setTimeout(function() {
 *       response.resolve({
 *           status: 200, headers: {}, body: ["Delayed"]
 *       });
 *   }, 1000);
 *   return response.promise;
 * }
 */
function defer() {
    var value;
    var listeners = [];
    var state = NEW;
    var lock = new java.lang.Object();

    /**
     * Resolve the promise.
     * @name Deferred.prototype.resolve
     * @param {Object} result the result or error value
     * @param {boolean} isError if true the promise is resolved as failed
     * @type function
     */
    var resolve = sync(function(result, isError) {
        if (state !== NEW) {
            throw new Error("Promise has already been resolved.");
        }
        value = result;
        state = isError ? FAILED : FULFILLED;
        listeners.forEach(notify);
        listeners = [];
        lock.notifyAll();
    }, lock);

    var notify = function(listener) {
        var isError = state === FAILED;
        var callback = isError ? listener.errback : listener.callback;
        spawn(function() {
            if (!callback) {
                // if no callback defined we pass through the value
                listener.tail.resolve(value, isError);
            } else {
                try {
                    listener.tail.resolve(callback(value), isError);
                } catch (error) {
                    listener.tail.resolve(error, true);
                }
            }
        });
    };

    /**
     * A promise object.
     * @ignore
     * @name Promise
     */
    var promise = {
        /**
         * Invoke a callback or errback function when the promise is resolved.
         * @name Promise.prototype.then
         * @param {function} callback called if the promise is resolved as fulfilled
         * @param {function} errback called if the promise is resolved as failed
         * @return {Object} a new promise that resolves to the return value of the
         *     callback or errback when it is called.
         */
        then: sync(function(callback, errback) {
            if (typeof callback !== "function") {
                throw new Error("First argument to then() must be a function.");
            }
            var tail = defer();
            var listener = {
                tail: tail,
                callback: callback,
                errback: errback
            };
            if (state === NEW) {
                listeners.push(listener); 
            } else {
                notify(listener);
            }
            return tail.promise;
        }, lock),
        
        /**
         * Wait for the promise to be resolved.
         * @name Promise.prototype.wait
         * @param {number} timeout optional time in milliseconds to wait for. If undefined
         *    wait() blocks forever.
         * @return {Object} the value if the promise is resolved as fulfilled
         * @throws {Object} the error value if the promise is resolved as failed
         */
        wait: sync(function(timeout) {
            if (state === NEW) {
                if (timeout === undefined) {
                    lock.wait();
                } else {
                    lock.wait(timeout);
                }
            }
            if (state === FAILED) {
                throw value;
            } else {
                return value;
            }
        }, lock)
    };

    return {
        resolve: resolve,
        promise: promise
    };
}

/** 
 * @name Deferred
 */

/** 
 * The promise object can be used to [register a callback][#deferred.promise.then] to be invoked when
 * the promise is eventually resolved, or [wait for the promise to be resolved][#deferred.promise.wait].
 * @name Deferred.prototype.promise
 *
 */

