var httpServer = require("../lib/main");
var builder = httpServer.build({
        // pass null config to avoid loading the default jetty.xml
        "config": null
    })
        // enable sessions with a custom node name
        .enableSessions({
            "name": "test1"
        })
        // serve application
        .serveApplication("/", module.resolve("./app"))
        // add websocket - this must be called after serveApplication
        // as it operates on the current context of the builder
        .addWebSocket("/websocket", function() {})
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