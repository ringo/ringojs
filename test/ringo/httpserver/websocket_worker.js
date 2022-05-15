require('ringo/logging').setConfig(getResource('../../log4j2.properties'));

const {URI} = java.net;
const {ClientUpgradeRequest, WebSocketClient} = org.eclipse.jetty.websocket.client;
const {WebSocketListener} = org.eclipse.jetty.websocket.api;
const {ByteBuffer} = java.nio;
const {JavaEventEmitter} = require("../../../modules/ringo/events");
const {HttpServer} = require("../../../modules/ringo/httpserver");
const {AbstractLifeCycleListener} = org.eclipse.jetty.util.component.AbstractLifeCycle;

const newListener = () => {
    return new JavaEventEmitter(WebSocketListener, {
        onWebSocketConnect: "connect",
        onWebSocketClose: "close",
        onWebSocketText: "text",
        onWebSocketBinary: "binary",
        onWebSocketError: "error"
    });
};

const onmessage = (event) => {
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
    let webSocketSession = null;

    const stopAll = () => {
        if (server !== null) {
            server.stop();
            server.destroy();
            server = null;
        }
        if (client !== null) {
            client.stop();
            client.destroy();
            client = null;
        }
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
                const listener = newListener();
                listener.on("error", (e) => {
                    try {
                        source.postError(e);
                    } finally {
                        stopAll();
                    }
                });
                listener.on("connect", (session) => {
                    webSocketSession = session;
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
                        webSocketSession.close();
                    }
                });
                listener.on("binary", (bytes) => {
                    try {
                        source.postMessage(bytes);
                    } catch (e) {
                        source.postError(e);
                    } finally {
                        webSocketSession.close();
                    }
                });
                listener.on("close", () => {
                    stopAll();
                });
                // create & connect a websocket client - once it's connected,
                // it will send a message to server, which in turn will echo
                // it back to the client
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
    server.jetty.addEventListener(lifeCycleListener);

    const appContext = server.serveApplication("/", () => {});

    appContext.addWebSocket(path, (socket) => {
        socket.on("text", (message) => {
            socket[isAsync ? "sendString" : "sendStringAsync"](message);
        });
        socket.on("binary", (bytes, offset, length) => {
            socket[isAsync ? "sendBinary" : "sendBinaryAsync"](bytes, offset, length);
        });
    });

    server.createHttpListener(config);
    server.start();
};
