/**
 * @fileoverview: The daemon control script invoked by the init script.
 */




var system = require('system');
var log = require('ringo/logging').getLogger(module.id);

var app, appId;

export('init', 'start', 'stop', 'destroy');


function init() {
    log.info("init", system.args);
    // Remove our own script name from args
    system.args.shift();
    if (system.args.length) {
        appId = system.args.shift();
        try {
            app = require(appId);
        } catch (error) {
            log.error("Error loading application module '" + appId + "'");
            log.error(error);
        }
    } else {
        log.error("No application module defined in command line arguments")
    }
    if (app && typeof app.init === "function") {
        app.init();
    }
}

function start() {
    log.info("start");
    if (app && typeof app.start === "function") {
        app.start();
    }
}

function stop() {
    log.info("stop");
    if (app && typeof app.stop === "function") {
        app.stop();
    }
}

function destroy() {
    log.info("destroy");
    if (app && typeof app.destroy === "function") {
        app.destroy();
    }
}

