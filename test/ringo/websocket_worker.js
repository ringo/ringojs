const {URI} = java.net;
const {ClientUpgradeRequest, WebSocketClient} = org.eclipse.jetty.websocket.client;
const {WebSocketListener} = org.eclipse.jetty.websocket.api;
const {ByteBuffer} = java.nio;
const {JavaEventEmitter} = require("ringo/events");
const {HttpServer} = require("ringo/httpserver");
const {AbstractLifeCycleListener} = org.eclipse.jetty.util.component.AbstractLifeCycle;

require('ringo/logging').setConfig(getResource('./httptest_log4j2.properties'));

const Listener = function() {
    return new JavaEventEmitter(WebSocketListener, {
        onWebSocketConnect: "connect",
        onWebSocketClose: "close",
        onWebSocketText: "text",
        onWebSocketBinary: "binary",
        onWebSocketError: "error"
    });
};

/**
 * The worker module needed by scheduler_test
 */
const onmessage = function(event) {
    const {source} = event;
    const {message, semaphore, isAsync} = event.data;
    const isBinary = (typeof message === "string");

    const host = "127.0.0.1";
    const port = String(4400 + (isAsync ? 0 : 1) + (isBinary ? 0 : 10));
    const path = "/websocket";
    const uri = "ws://" + host + ":" + port + path;

    const config = {
        host: host,
        port: port
    };

    let server = new HttpServer();
    let client = new WebSocketClient();

    const stopAll = () => {
        server.stop();
        server.destroy();
        server = null;
        client.stop();
        client.destroy();
        client = null;
    };

    const lifeCycleListener = new AbstractLifeCycleListener({
        lifeCycleFailure: (event, error) => {
            source.postError(error);
            stopAll();
        },
        lifeCycleStarted: () => {
            try {
                const socketUri = new URI(uri);
                const request = new ClientUpgradeRequest();
                const listener = new Listener();
                listener.on("error", (e) => {
                    try {
                        source.postError(e);
                    } finally {
                        stopAll();
                    }
                });
                listener.on("connect", (session) => {
                    try {
                        const remote = session.getRemote();
                        if (isBinary) {
                            remote.sendString(message);
                        } else {
                            remote.sendBytes(ByteBuffer.wrap(message));
                        }
                    } catch (e) {
                        source.postError(e);
                        stopAll();
                    }
                });
                listener.on("text", (message) => {
                    try {
                        source.postMessage(message);
                    } catch (e) {
                        source.postError(e);
                    } finally {
                        stopAll();
                    }
                });
                listener.on("binary", (bytes) => {
                    try {
                        source.postMessage(bytes);
                    } catch (e) {
                        source.postError(e);
                    } finally {
                        stopAll();
                    }
                });
                client.start();
                client.connect(listener.impl, socketUri, request);
            } catch (e) {
                source.postError(e);
                stopAll();
            }
        },
        lifeCycleStopped: () => {
            semaphore.signal();
        }
    });
    server.jetty.addLifeCycleListener(lifeCycleListener);

    const appContext = server.serveApplication("/", function(req) {
        req.charset = 'utf8';
        req.pathInfo = decodeURI(req.pathInfo);
        return getResponse(req);
    });

    appContext.addWebSocket(path, function(socket, session) {
        socket.on("text", function(message) {
            socket[isAsync ? "sendString" : "sendStringAsync"](message);
        });
        socket.on("binary", function(bytes, offset, length) {
            socket[isAsync ? "sendBinary" : "sendBinaryAsync"](bytes, offset, length);
        });
    });

    server.createHttpListener(config);
    server.start();
};
