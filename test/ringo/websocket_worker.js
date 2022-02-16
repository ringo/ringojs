const {URI} = java.net;
const {ClientUpgradeRequest, WebSocketClient} = org.eclipse.jetty.websocket.client;
const {WebSocketListener} = org.eclipse.jetty.websocket.api;
const {ByteBuffer} = java.nio;
const {JavaEventEmitter} = require("ringo/events");
const {HttpServer} = require("ringo/httpserver");

require('ringo/logging').setConfig(getResource('./httptest_log4j2.properties'));

const host = "127.0.0.1";
const port = "4400";
const path = "/websocket";
const uri = "ws://" + host + ":" + port + path;

const config = {
    host: host,
    port: port
};

const Listener = function() {
    return new JavaEventEmitter(WebSocketListener, {
        "onWebSocketConnect": "connect",
        "onWebSocketClose": "close",
        "onWebSocketText": "text",
        "onWebSocketBinary": "binary",
        "onWebSocketError": "error"
    });
};

/**
 * The worker module needed by scheduler_test
 */
const onmessage = function(event) {
    const {message, semaphore, isAsync} = event.data;
    const isBinary = (typeof message === "string");
    let server = new HttpServer();
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

    const client = new WebSocketClient();
    client.start();

    const socketUri = new URI(uri);
    const request = new ClientUpgradeRequest();

    const listener = new Listener();
    listener.on("connect", function(session) {
        const remote = session.getRemote();
        if (isBinary) {
            remote.sendString(message);
        } else {
            remote.sendBytes(ByteBuffer.wrap(message));
        }
    });
    listener.on("text", function(message) {
        event.source.postMessage(message);
        semaphore.signal();
        server.stop();
        server.destroy();
        server = null;
    });
    listener.on("binary", function(bytes, offset, length) {
        event.source.postMessage(bytes);
        semaphore.signal();
        server.stop();
        server.destroy();
        server = null;
    });
    client.connect(listener.impl, socketUri, request);
};
