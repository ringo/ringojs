// Simple event source server demo
var response = require("ringo/jsgi/response");
var arrays = require("ringo/utils/arrays");

var connections = [];

exports.app = function(req) {
    return response.static(module.resolve("html/eventsource.html"), "text/html");
};

function onconnect(eventSource) {
    eventSource.addListener("open", function() {
        connections.push(eventSource);
        console.info("Opening connection, " + connections.length + " open");
    });
    eventSource.addListener("close", function() {
        arrays.remove(connections, eventSource);
        console.info("Closing connection, " + connections.length + " remaining");
    });
}

function doPing() {
    console.info("Sending ping to all connections");
    connections.forEach(function(eventSource) {
        eventSource.data('Ping ' + new Date());
    });
}

if (require.main == module) {
    var server = require("ringo/httpserver").main(module.id);
    server.getDefaultContext().addEventSource("/eventsource", onconnect);
    setInterval(doPing, 2 * 1000);
}