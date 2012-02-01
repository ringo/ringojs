// Minimal websocket demo
var response = require("ringo/jsgi/response");
var arrays = require("ringo/utils/arrays");

var connections = [];

exports.app = function(req) {
    return response.static(module.resolve("html/websocket.html"), "text/html");
};

function onconnect(conn) {
    conn.addListener("open", function() {
        connections.push(conn);
    });
    conn.addListener("message", function(message) {
        connections.forEach(function(conn) {
            conn.send(message);
        })
    });
    conn.addListener("close", function() {
        arrays.remove(connections, conn);
    })
}

if (require.main == module) {
    var server = require("ringo/httpserver").main(module.id);
    server.getDefaultContext().addWebSocket("/websocket", onconnect);
}