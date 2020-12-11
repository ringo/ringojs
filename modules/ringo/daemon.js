/**
 * @fileoverview The daemon control script invoked by the init script.
 *
 * This module interprets the first command line argument as module ID, load
 * the module and try to invoke the life cycle functions on it.
 *
 * For HTTP servers it is generally more convenient to directly use
 * `ringo/httpserver` which will create a new server instance and pass it to
 * as argument to the application life cycle functions.
 */

const system = require('system');
const log = require('ringo/logging').getLogger(module.id);

let app;

/**
 * Called when the daemon instance is created.
 *
 * This function can be run with superuser id to perform privileged actions
 * before the daemon is started.
 */
exports.init = () => {
    log.info("init", system.args);
    // Remove our own script name from args
    system.args.shift();
    if (system.args.length) {
        const appId = system.args[0];
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
};

/**
 * Called when the daemon instance is started.
 */
exports.start = () => {
    log.info("start");
    if (app && typeof app.start === "function") {
        app.start();
    }
};

/**
 * Called when the daemon is stopped.
 */
exports.stop = () => {
    log.info("stop");
    if (app && typeof app.stop === "function") {
        app.stop();
    }
};

/**
 * Called when the daemon is destroyed.
 */
exports.destroy = () => {
    log.info("destroy");
    if (app && typeof app.destroy === "function") {
        app.destroy();
    }
};
