const system = require("system");
const assert = require("assert");

const {Worker} = require("../../../modules/ringo/worker");
const {Semaphore} = require("../../../modules/ringo/concurrent");

let serverWorker = null;
let clientWorker = null;


exports.tearDown = () => {
    serverWorker && serverWorker.terminate();
    clientWorker && clientWorker.terminate();
}

exports.testEventSource = () => {
    const serverSemaphore = new Semaphore();
    const clientSemaphore = new Semaphore();
    const MESSAGE = "hello";
    const TIMEOUT = 1000;
    const LINE_SEPARATOR = "\r\n";

    let serverReceived = null;
    let clientReceived = [];

    const onError = (event) => {
        throw event.data;
    };

    serverWorker = new Worker(module.resolve("./eventsource_server"));
    serverWorker.onmessage = (event) => {
        serverReceived = event.data;
        serverSemaphore.signal();
    };
    serverWorker.onerror = onError;

    clientWorker = new Worker(module.resolve("./eventsource_client"));
    clientWorker.onmessage = (event) => {
        clientReceived.push(event.data);
        clientSemaphore.signal();
    };
    clientWorker.onerror = onError;

    const options = {
        host: "127.0.0.1",
        port: 4400,
        path: "/events"
    };

    // start server and wait for it
    serverWorker.postMessage({
        action: "start",
        options: options,
        message: MESSAGE
    }, true);
    if (!serverSemaphore.tryWait(TIMEOUT)) {
        assert.fail("server start timed out");
    }
    assert.strictEqual(serverReceived, "started");

    // start client & wait for response (4 parts)
    clientWorker.postMessage(options, true);
    if (!clientSemaphore.tryWait(TIMEOUT, 4)) {
        assert.fail("client start timed out");
    }

    // first part received is the http response header
    const responseHeaderLines = clientReceived[0].split(LINE_SEPARATOR);
    assert.strictEqual(responseHeaderLines.length, 4);
    assert.strictEqual(responseHeaderLines[0], "HTTP/1.1 200 OK");
    assert.strictEqual(responseHeaderLines[2], "Content-Type: text/event-stream;charset=utf-8");
    assert.strictEqual(responseHeaderLines[3], "Connection: close");

    // test received messages
    // wait for messages from client worker
    [
        ": hello",
        "data: hello",
        "event: test\r\ndata: hello"
    ].forEach((expected, index) => {
        assert.strictEqual(clientReceived[index + 1], expected);
    });

    serverWorker.postMessage({action: "stop"}, true);
    if (!serverSemaphore.tryWait(TIMEOUT)) {
        assert.fail("server stop timed out");
    }
    assert.strictEqual(serverReceived, "stopped");
};

if (require.main === module) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
