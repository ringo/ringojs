var {URI} = java.net;
var {ClientUpgradeRequest, WebSocketClient} = org.eclipse.jetty.websocket.client;
var {WebSocketListener, StatusCode} = org.eclipse.jetty.websocket.api;
var {ByteBuffer} = java.nio;
var {JavaEventEmitter} = require("ringo/events");
var {Server} = require("ringo/httpserver");

require('ringo/logging').setConfig(getResource('./httptest_log4j.properties'));

var host = "127.0.0.1";
var port = "4400";
var path = "/websocket";
var uri = "ws://" + host + ":" + port + path;

var config = {
    host: host,
    port: port,
    app: function() {}
};

var Listener = function() {
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
var onmessage = function(event) {
    var {message, semaphore, isAsync} = event.data;
    var isBinary = (typeof message === "string");
    var server = new Server(config);
    server.start();
    server.getDefaultContext().addWebSocket(path, function(socket, session) {
        socket.on("text", function(message) {
            socket[isAsync ? "sendString" : "sendStringAsync"](message);
        });
        socket.on("binary", function(bytes, offset, length) {
            socket[isAsync ? "sendBinary" : "sendBinaryAsync"](bytes, offset, length);
        });
    });

    var client = new WebSocketClient();
    client.start();

    var socketUri = new URI(uri);
    var request = new ClientUpgradeRequest();

    var listener = new Listener();
    listener.on("connect", function(session) {
        var remote = session.getRemote();
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
