var {HttpServer} = require("../lib/main");

var httpServer = new HttpServer();
httpServer.enableSessions();

// init the application context
var appContext = httpServer.serveApplication("/", module.resolve("./app"));
// and add a websocket to it
appContext.addWebSocket("/events", function() {});

// initialize static file serving
var staticContext = httpServer.serveStatic("/static", module.resolve("./"), {
    "allowDirectoryListing": true
});

// http listener
httpServer.createHttpListener({
    "port": 8080
});

// https listener
httpServer.createHttpsListener({
    "port": 8443,
    "keyStore": module.resolve("./keystore"),
    "keyStorePassword": "secret",
    "keyManagerPassword": "secret"
});

// start
httpServer.jetty.start();