const {Worker} = require("ringo/worker");

function main() {
    // Create a new workers from this same module. Note that this will
    // create a new instance of this module as workers are isolated.
    for (let i = 0; i < 8; i++) {
        let worker = new Worker(module.id);
        worker.onmessage = function(e) {
            print("Got reply from worker " + e.data);
        }
        worker.postMessage(i);
    }
}

function onmessage(e) {
    print("Starting worker " + e.data);
    e.source.postMessage(e.data);
}

if (require.main === module) {
    main();
}

