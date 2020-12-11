const {Worker} = require("ringo/worker")

function main() {
    // Create a new workers from this same module. Note that this will
    // create a new instance of this module as workers are isolated.
    const worker = new Worker(module.id);

    // Define callback for messages from the worker
    worker.onmessage = function(e) {
        print("Message from worker: " + e.data);
    };

    // Post a message to the worker
    worker.postMessage("Hi there!");
}

function onmessage(e) {
    print("Message from main script: " + e.data);
    // Post a message back to the event source
    e.source.postMessage("What's up?");
}

if (require.main === module) {
    main();
}

