const httpServer = require("ringo/httpserver");
const builder = httpServer.build()
        // enable sessions with a custom node name
        .enableSessions({
            "name": "test1"
        })
        // serve application
        .serveApplication("/", module.resolve("./httpserver-app"), {
            "sessions": true
        })
        // add websocket - this must be called after serveApplication
        // as it operates on the current context of the builder
        .addWebSocket("/websocket", () => {})
        // static file serving
        .serveStatic("/static", module.resolve("./"), {
            "allowDirectoryListing": true
        })
        // http listener
        .http({
            "port": 8080
        })
        // https listener
        .https({
            "port": 8443,
            "keyStore": module.resolve("./keystore"),
            "keyStorePassword": "secret",
            "keyManagerPassword": "secret"
        })
        // start up the server
        .start();
