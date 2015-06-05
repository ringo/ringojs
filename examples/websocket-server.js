// Simple websocket server demo
var response = require("ringo/jsgi/response");
var arrays = require("ringo/utils/arrays");

var connections = [];

exports.app = function(req) {
    return response.static(module.resolve("html/websocket.html"), "text/html");
};

function onconnect(conn) {
    connections.push(conn);
    console.info("Opening connection, " + connections.length + " open");
    conn.addListener("text", function(message) {
        connections.forEach(function(conn) {
            conn.send(message);
        });
        console.info("Sending message");
    });
    conn.addListener("close", function() {
        arrays.remove(connections, conn);
        console.info("Closing connection, " + connections.length + " remaining");
    })
}

if (require.main == module) {
    var server = require("ringo/httpserver").main(module.id);
    server.getDefaultContext().addWebSocket("/websocket", onconnect);
}