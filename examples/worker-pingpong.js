const {Worker} = require("ringo/worker");

let i = 0;

function main() {
    // Create a new workers from this same module. Note that this will
    // create a new instance of this module as workers are isolated.
    const worker = new Worker(module.id);

    worker.onmessage = function(e) {
        print(e.data);
        e.source.postMessage("  PING");
    };

    worker.onerror = function(e) {
        print(e.data);
    }

    worker.postMessage("  PING");
}

function onmessage(e) {
    print(e.data);
    if (i++ > 10) {
        throw new Error("CRASH");
    }
    e.source.postMessage("        PONG");
}

if (require.main === module) {
    main();
}

