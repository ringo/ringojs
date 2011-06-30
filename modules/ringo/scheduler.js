/**
 * @fileoverview This module provides support for scheduling invocation of
 * functions.
 */

var {newScheduledThreadPool, newCachedThreadPool} =
        java.util.concurrent.Executors;
var {Callable} = java.util.concurrent;
var {MILLISECONDS} = java.util.concurrent.TimeUnit;

var ids = new java.util.concurrent.atomic.AtomicInteger();

function newThread(runnable) {
    var thread = new java.lang.Thread(runnable,
                "ringo-scheduler-" + ids.incrementAndGet());
    thread.setDaemon(true);
    return thread;
}

var executor = executor || newCachedThreadPool(newThread);
var scheduler = scheduler || newScheduledThreadPool(4, newThread);

var security = java.lang.System.getSecurityManager();
var spawnPermission = org.ringojs.security.RingoSecurityManager.SPAWN_THREAD;
/**
 * Executes a function after specified delay.
 * @param {function} callback a function
 * @param {number} delay the delay in milliseconds
 * @param {...} [args] optional arguments to pass to the function
 * @returns {object} an id object useful for cancelling the scheduled
 * invocation
 */
exports.setTimeout = function(callback, delay) {
    if (security) security.checkPermission(spawnPermission);
    var args = Array.slice(arguments, 2);
    var runnable = new Callable({
        call: function() {
            try {
                return callback.apply(global, args);
            } finally {
                global.decreaseAsyncCount();
            }
        }
    });
    delay = parseInt(delay, 10) || 0;
    global.increaseAsyncCount();
    return delay == 0 ?
            executor.submit(runnable) :
            scheduler.schedule(runnable, delay, MILLISECONDS);
};

/**
 * Cancel a timeout previuosly scheduled with setTimeout().
 * @param {object} id the id object returned by setTimeout()
 * @see setTimeout
 */
exports.clearTimeout = function(id) {
    if (security) security.checkPermission(spawnPermission);
    try {
        if (id.cancel(false)) {
            global.decreaseAsyncCount();
        }
    } catch (e) {
        // ignore
    }
};

/**
 * Calls a function repeatedly, with a fixed time delay between each call to
 * that function.
 * @param {function} callback a function
 * @param {number} delay the delay in milliseconds
 * @param {...} args optional arguments to pass to the function
 * @returns {object} an id object useful for cancelling the scheduled invocation
 */
exports.setInterval = function(callback, delay) {
    if (security) security.checkPermission(spawnPermission);
    var args = Array.slice(arguments, 2);
    var runnable = new java.lang.Runnable({
        run: function() {
            try {
                callback.apply(global, args);
            } catch (e) {
                // ignore
            }
        }
    });
    delay = Math.max(parseInt(delay, 10) || 0, 1);
    global.increaseAsyncCount();
    return scheduler.scheduleAtFixedRate(runnable, delay, delay, MILLISECONDS);
};

/**
 * Cancel a timeout previuosly scheduled with setInterval().
 * @param {object} id the id object returned by setInterval()
 * @see setInterval
 */
exports.clearInterval = function(id) {
    if (security) security.checkPermission(spawnPermission);
    try {
        if (id.cancel(false)) {
            global.decreaseAsyncCount();
        }
    } catch (e) {
        // ignore
    }
};
