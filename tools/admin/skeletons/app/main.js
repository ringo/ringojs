#!/usr/bin/env ringo

// main script to start application

if (require.main == module) {
    var config = module.resolve("./config")
    require("ringo/httpserver").Server({
        config: config,
        app: "app"
    }).start()
}
