const {Worker} = require("ringo/worker")
const {Semaphore} = require("ringo/concurrent")

function main() {
    // Create a new workers from this same module. Note that this will
    // create a new instance of this module as workers are isolated.
    const worker = new Worker(module.id);
    const semaphore = new Semaphore();

    worker.onmessage = function(e) {
        print("  Response from worker: " + e.data);
        semaphore.signal();
    };

    // Calling worker.postMessage with true as second argument causes
    // callbacks from the worker to be executed synchronously in
    // the worker's own thread instead of in our own event loop thread,
    // allowing us to wait synchronously for replies.
    worker.postMessage(1, true);

    // Wait until the semaphore gets 3 signals.
    semaphore.wait(3);
    print("Got 3 responses from worker.");
    // Wait for 2 more responses.
    semaphore.wait(2);
    print("Got 2 more responses, quitting.");
}


function onmessage(e) {
    print("Worker got message: " + e.data);
    let count = 1;
    // Send 5 responses back to the caller.
    const id = setInterval(function() {
        e.source.postMessage(count);
        if (count++ >= 5) {
            clearInterval(id);
        }
    }, 500);
}

if (require.main === module) {
    main();
}

