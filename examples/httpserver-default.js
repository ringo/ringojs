const {HttpServer} = require("ringo/httpserver");

const httpServer = new HttpServer();
httpServer.enableSessions({
    "name": "myapp"
});

// init the application context
const appContext = httpServer.serveApplication("/", module.resolve("./httpserver-app"), {
    "sessions": true
});
// and add a websocket to it
appContext.addWebSocket("/events", () => {});

// initialize static file serving
const staticContext = httpServer.serveStatic("/static", module.resolve("./"), {
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
