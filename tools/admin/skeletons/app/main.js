#!/usr/bin/env ringo

// main script to start application
if (require.main == module) {
    require("ringo/httpserver").main(module.resolve("./routes/index.js"));
}
