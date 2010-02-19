#!/usr/bin/env ringo

// main script to start application

if (require.main == module.id) {
    require("ringo/webapp").start();
}
