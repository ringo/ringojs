#!/usr/bin/env ringo

// main script to start application

if (require.main == module) {
    require("ringo/webapp").main(module.directory);
}
