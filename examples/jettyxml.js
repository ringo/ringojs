var httpServer = require("../lib/main");
var builder = httpServer.build("config/jetty.xml")
        // serve application
        .serveApplication("/", module.resolve("./app"))
        // static file serving
        .serveStatic("/static", module.resolve("./"), {
            "allowDirectoryListing": true
        })
        // start up the server
        .start();