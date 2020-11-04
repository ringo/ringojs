const httpServer = require("ringo/httpserver");
const builder = httpServer.build("config/jetty.xml")
        // serve application
        .serveApplication("/", module.resolve("./httpserver-app"))
        // static file serving
        .serveStatic("/static", module.resolve("./"), {
            "allowDirectoryListing": true
        })
        // start up the server
        .start();
