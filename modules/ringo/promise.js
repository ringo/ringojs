/**
 * @fileOverview Allows to work with deferred values that will be resolved in the future.
 */

const NEW = 0;
const FULFILLED = 1;
const FAILED = 2;

/**
 * Creates an object representing a deferred value.
 * The deferred object has two properties: a [promise](#Promise)
 * object and a [resolve()](#Deferred.prototype.resolve) function.
 *
 * The promise object can be used to [register a callback](#Promise.prototype.then)
 * to be invoked when the promise is eventually resolved.
 *
 * The [resolve](#Deferred.prototype.resolve) function is used to resolve the
 * promise as either fulfilled or failed.
 *
 * @constructor
 * @example
 * // --- sample output ---
 * // getDeferredValue() ...
 * // getDeferredValue() finished after 396 ms
 * // Resolved promise, got foo
 * // Total time:  2400 ms
 *
 * const getDeferredValue = function () {
 *   const deferred = new Deferred();
 *   setTimeout(function() {
 *     deferred.resolve("foo");
 *   }, 2000);
 *
 *   return deferred;
 * };
 *
 * const start = Date.now();
 * console.log("getDeferredValue() ... ");
 *
 * const def = getDeferredValue();
 * console.log("getDeferredValue() finished after",
 *   Date.now() - start, "ms");
 *
 * def.promise.then(function(value) {
 *   console.log("Resolved promise, got", value);
 *   console.log("Total time: ", Date.now() - start, "ms");
 * });
 */
const Deferred = exports.Deferred = function Deferred() {
    const lock = new java.lang.Object();
    let value;
    let listeners = [];
    let state = NEW;

    /**
     * Resolve the promise.
     * @name Deferred.prototype.resolve
     * @param {Object} result the result or error value
     * @param {Boolean} isError if true the promise is resolved as failed
     * @type Function
     */
    const resolve = sync((result, isError) => {
        if (state !== NEW) {
            throw new Error("Promise has already been resolved.");
        }
        value = result;
        state = isError ? FAILED : FULFILLED;
        listeners.forEach(notify);
        listeners = [];
        lock.notifyAll();
    }, lock);

    const notify = listener => {
        let isError = (state === FAILED);
        let result = value;
        const callback = isError ? listener.errback : listener.callback;

        if (callback) {
            try {
                result = callback(value);
            } catch (error) {
                result = error;
                isError = true;
            }
        }
        // If result is a promise, chain its result to our existing promise. Else resolve directly.
        if (result != null && typeof result.then === 'function') {
            result.then(val => {
                listener.tail.resolve(val, isError);
            }, err => {
                listener.tail.resolve(err, true);
            });
        } else {
            listener.tail.resolve(result, isError);
        }
    };

    /**
     * The promise object can be used to [register a callback](#Promise.prototype.then)
     * to be invoked when the promise is eventually resolved.
     * @name Deferred.prototype.promise
     */
    const promise = {
        /**
         * Register callback and errback functions to be invoked when
         * the promise is resolved.
         * @name Promise.prototype.then
         * @param {Function} callback called if the promise is resolved as fulfilled
         * @param {Function} errback called if the promise is resolved as failed
         * @return {Object} a new promise that resolves to the return value of the
         *     callback or errback when it is called.
         */
        then: sync((callback, errback) => {
            if (typeof callback !== "function") {
                throw new Error("First argument to then() must be a function.");
            }
            const tail = new Deferred();
            const listener = {
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
         * @param {Number} timeout optional time in milliseconds to wait for.
         *                 If timeout is undefined wait() blocks forever.
         * @return {Object} the value if the promise is resolved as fulfilled
         * @throws Object the error value if the promise is resolved as failed
         */
        wait: sync(timeout => {
            if (state === NEW) {
                if (typeof timeout === "undefined") {
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
};

/**
 * The PromiseList class allows to combine several promises into one.
 * It represents itself a promise that resolves to an array of objects,
 * each containing a `value` or `error` property with the value
 * or error of the corresponding promise argument.
 *
 * A PromiseList resolves successfully even if some or all of the partial
 * promises resolve to an error. It is the responsibility of the handler
 * function to check each individual promise result.
 *
 * @param {Promise...} promise... any number of promise arguments.
 * @constructor
 * @example
 * // --- sample output ---
 * // Done!
 * // { value: 'i am ok' }
 * // { value: 1 }
 * // { error: 'some error' }
 *
 * let d1 = Deferred(), d2 = Deferred(), d3 = Deferred();
 *
 * // PromiseList accepts a promise or deferred object
 * let list = PromiseList(d1.promise, d2, d3);
 *
 * list.then(function(results) {
 *   console.log("Done!");
 *   results.forEach(function(result) {
 *     console.dir(result);
 *   });
 * }, function(error) {
 *    console.error("Error :-(");
 * });
 *
 * d2.resolve(1);
 * d3.resolve("some error", true);
 * d1.resolve("i am ok");
 */
exports.PromiseList = function PromiseList(args) {
    const promises = Array.isArray(args) ? args : Array.prototype.slice.call(arguments);
    const count = new java.util.concurrent.atomic.AtomicInteger(promises.length);
    const results = [];
    const deferred = new Deferred();

    promises.forEach((promise, index) => {
        if (typeof promise.then !== "function" && promise.promise) {
            promise = promise.promise;
        }
        promise.then(
            sync(value => {
                results[index] = {value: value};
                if (count.decrementAndGet() === 0) {
                    deferred.resolve(results);
                }
            }, count),
            sync(error => {
                results[index] = {error: error};
                if (count.decrementAndGet() === 0) {
                    deferred.resolve(results);
                }
            }, count)
        );
    });
    return deferred.promise;
};

/**
 * A promise object. This class is not exported, create a
 * [deferred object](#Deferred) to create a promise.
 * @name Promise
 */
