/**
 * @fileOverview Allows to work with deferred values that will be resolved in the future.
 */

export("defer", "promises");

var NEW = 0;
var FULFILLED = 1;
var FAILED = 2;

/**
 * Returns an object of type `Deferred` representing a deferred value. 
 * The deferred is a JavaScript object with two properties: a `Promise` object and a resolve function.
 *
 * The promise object can be used to [register a callback](#Promise.prototype.then) to be invoked when
 * the promise is eventually resolved, or [wait for the promise to be resolved](#Promise.prototype.wait).
 *
 * The [resolve](#Deferred.prototype.resolve) function is used to resolve the promise as either fulfilled or failed.
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

    /**
     * Resolve the promise.
     * @name Deferred.prototype.resolve
     * @param {Object} result the result or error value
     * @param {boolean} isError if true the promise is resolved as failed
     * @type function
     */
    var resolve = function(result, isError) {
        if (state !== NEW) {
            throw new Error("Promise has already been resolved.");
        }
        value = result;
        state = isError ? FAILED : FULFILLED;
        listeners.forEach(notify);
        listeners = [];
    };

    var notify = function(listener) {
        var isError = state === FAILED;
        var callback = isError ? listener.errback : listener.callback;
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
        then: function(callback, errback) {
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
        }

    };

    return {
        resolve: resolve,
        promise: promise
    };
}

/**
 * Combine several promises passed as arguments into one. The promise
 * returned by this function resolves to an array of objects,
 * each containing a `value` or `error` property with the value
 * or error of the corresponding promise. The returned promise
 * always resolves successfully, provided all input promises are resolved.
 * @param {promise} promise... any number of promises
 * @returns {promise} a promise resolving to an array of the argument
 *     promises' values
 */
function promises() {
    var promises = Array.slice(arguments);
    var count = promises.length;
    var results = [];
    var i = 0;
    var deferred = defer();

    promises.forEach(function(promise) {
        if (typeof promise.then !== "function" && promise.promise) {
            promise = promise.promise;
        }
        var index = i++;
        promise.then(
            function(value) {
                results[index] = {value: value};
                if (--count == 0) {
                    deferred.resolve(results);
                }
            },
            function(error) {
                results[index] = {error: error};
                if (--count == 0) {
                    deferred.resolve(results);
                }
            }
        );
    });
    return deferred.promise;
}

/** 
 * @name Deferred
 */

/** 
 * The promise object can be used to [register a callback](#Promise.prototype.then) to be invoked when
 * the promise is eventually resolved, or [wait for the promise to be resolved](#Promise.prototype.wait).
 * @name Deferred.prototype.promise
 *
 */

