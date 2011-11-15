var {Worker} = require("ringo/worker")

function main() {
    // create a new worker from this same module
    var w = new Worker(module.id);

    w.onmessage = function(e) {
        print("Message from worker: " + e.data);
    };

    w.postMessage("Hi there!");
}

function onmessage(e) {
    print("Message from main script: " + e.data);
    e.source.postMessage("What's up?");
}

if (require.main === module) {
    main();
}

