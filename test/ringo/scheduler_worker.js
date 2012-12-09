/**
 * The worker module needed by scheduler_test
 */
function onmessage(e) {
    if (e.data.test == 1) {
        setTimeout(function(arg) {
            e.source.postMessage(arg);
            e.data.semaphore.signal();
        }, 1, "value");
    } else {
        var id = setInterval(function(arg) {
            e.source.postMessage(arg);
            e.data.semaphore.signal();
        }, 5, 10);
    }
}
