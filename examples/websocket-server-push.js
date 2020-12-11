// Simple websocket server demo
const response = require("ringo/jsgi/response");
const arrays = require("ringo/utils/arrays");
const httpServer = require("ringo/httpserver");

const connections = [];

// Schedule an interval function that periodically broadcasts the number of open connections
setInterval(() => {
   connections.forEach((conn) => {
       conn.send((connections.length - 1) + " other connection(s) open");
   });
}, 5000)

const app = (req) => {
    return response.static(module.resolve("html/websocket.html"), "text/html");
};

const onConnect = (conn) => {
    connections.push(conn);
    console.info("Opening connection, " + connections.length + " open");
    conn.addListener("text", message => {
        connections.forEach(conn => conn.send(message));
        console.info("Sending message");
    });
    conn.addListener("close", () => {
        arrays.remove(connections, conn);
        console.info("Closing connection, " + connections.length + " remaining");
    });
};

if (require.main == module) {
    httpServer.build()
        // enable sessions with a custom node name
        // serve application
        .serveApplication("/", app)
        // add websocket - this must be called after serveApplication
        // as it operates on the current context of the builder
        .addWebSocket("/websocket", onConnect)
        .http({
            "port": 8080
        })
        // start up the server
        .start();
}
