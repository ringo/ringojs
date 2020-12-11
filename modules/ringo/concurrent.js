/**
 * @fileoverview Utilities for working with multiple concurrently running threads.
 */

const {Semaphore: JavaSemaphore, TimeUnit} = java.util.concurrent;

/**
 * A counting semaphore that can be used to coordinate and synchronize
 * cooperation between synchronous threads. A semaphore keeps a number of permits.
 *
 * Note that `Worker` events are usually run in the single thread of the local
 * event loop and thus don't require synchronization provided by semaphores.
 * The only case when you may want to use a semaphore with workers is when
 * setting the `syncCallbacks` flag as second argument to `Worker.postMessage()`
 * since this will cause callbacks from the worker to be run in their own
 * thread instead of the event loop.
 *
 * To synchronize threads using a semaphore, a threads may ask for one or more
 * permits using the [wait](#Semaphore.prototype.wait) and
 * [tryWait](#Semaphore.prototype.tryWait)
 * methods. If the requested number of permits is available, they are subtracted
 * from the number of permits in the semaphore and the method returns immediately.
 *
 * If the number of requested permits is not available, the `wait` and `tryWait`
 * methods block until another thread adds the required permits using the
 * [signal](#Semaphore.prototype.signal) method or, in the case of `tryWait`,
 * the specified timeout expires.
 *
 * @param {Number} permits the number of initial permits, defaults to 0
 */
exports.Semaphore = function Semaphore(permits) {
    if (!(this instanceof Semaphore)) {
        return new Semaphore(permits);
    }

    const semaphore = new JavaSemaphore(permits === undefined ? 0 : permits);

    /**
     * Wait for one or more permits.
     * @param {Number} permits the number of permits to wait for, defaults to 1
     */
    this.wait = function(permits) {
        semaphore.acquire(permits === undefined ? 1 : permits);
    };

    /**
     * Wait for one or more permits for the given span of time. Returns true
     * if the requested permits could be acquired before the timeout elapsed.
     * @param {Number} timeout The span of time to wait, in milliseconds
     * @param {Number} permits the number of permits to wait for, defaults to 1
     * @return true if the requested permits could be acquired, false if the
     *   timeout elapsed
     */
    this.tryWait = function(timeout, permits) {
        return semaphore.tryAcquire(permits === undefined ? 1 : permits,
            timeout, TimeUnit.MILLISECONDS);
    };

    /**
     * Add one or more permits to the semaphore.
     * @param {Number} permits the number of permits to give, defaults to 1
     */
    this.signal = function(permits) {
        semaphore.release(permits === undefined ? 1 : permits);
    };
}
