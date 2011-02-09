#!/usr/bin/env ringo

// main script to start application

if (require.main == module) {
    var app = require("./config").app
    require("ringo/httpserver").Server({ app: app }).start()
}
