var {Worker} = require("ringo/worker");
var i = 0;

function main() {
    // create a new worker from this same module
    var w = new Worker(module.id);

    w.onmessage = function(e) {
        print(e.data);
        e.source.postMessage("  PING");
    };

    w.onerror = function(e) {
        print(e.data);
        system.exit();
    }

    w.postMessage("  PING");
}

function onmessage(e) {
    print(e.data);
    if (i++ > 10) throw new Error("CRASH");
    e.source.postMessage("        PONG");
}

if (require.main === module) {
    main();
}

