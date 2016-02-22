var {HttpServer} = require("../lib/main");

// instantiate the http server
var httpServer = new HttpServer({
    // pass a "null" config to avoid loading the default jetty.xml
    "config": null
});
// enable sessions
httpServer.enableSessions();

// init the application context
var appContext = httpServer.serveApplication("/", module.resolve("./app"));
// add a websocket to it
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