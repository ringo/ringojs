var {Worker} = require("ringo/worker")
var {Semaphore} = require("ringo/concurrent")
var {setInterval, clearInterval} = require("ringo/scheduler");

function main() {
    // Create a new worker from this same module.
    // Note that this will create a new instance of
    // this module as workers are isolated.
    var w = new Worker(module.id);
    var s = new Semaphore();

    w.onmessage = function(e) {
        print("Got signal from worker: " + e.data);
        s.signal(e.data);
    };

    // Calling worker.postMessage with true as second 
    // argument causes callbacks from the worker to be 
    // executed synchronously in the worker's own thread
    // instead of in our own event loop thread, allowing
    // us to wait synchronously for replies.
    w.postMessage(1, true);

    // Wait until the semaphore gets 5 signals. 
    s.wait(5);
    print("Got 5 signals, quitting.");
}


function onmessage(e) {
    print("Worker got message: " + e.data);
    var count = 0;
    var id = setInterval(function() {
        e.source.postMessage(e.data);
        if (++count >= 5) clearInterval(id);
    }, 500);
}

if (require.main === module) {
    main();
}

