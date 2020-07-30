/**
 * @fileoverview A module containing build and daemon lifecycle methods for http server
 */
const log = require("ringo/logging").getLogger(module.id);
const system = require("system");
const fs = require("fs");

const HttpServerBuilder = require("./builder");

/**
 * A named export of the <a href="../httpserver">HttpServer</a> module.
 */
const HttpServer = exports.HttpServer = require("./httpserver");
const utils = require("./utils");

let httpServer = null;
let options = null;

/**
 * Returns a new HttpServerBuilder instance
 * @param {String|Object} options Either the path to the jetty.xml configuration
 * file, or an object containing the following properties:
 * <ul>
 * <li>stopAtShutdown: (boolean, default: true)</li>
 * <li>stopTimeout: (Number, default: 1000 millis)</li>
 * <li>dumpBeforeStart: (boolean, default: false)</li>
 * <li>dumpBeforeStop: (boolean, default: false)</li>
 * </ul>
 *
 * @returns {HttpServerBuilder} A newly created <a href="../builder/index.html">HttpServerBuilder</a> instance
 */
exports.build = function(options) {
    return new HttpServerBuilder(options);
};

/**
 * Daemon life cycle function invoked by init script. Creates a new Server with
 * the application at `appPath`. If the application exports a function called
 * `init`, it will be invoked with the new server as argument.
 *
 * @param {String} path Optional application file name or module id.
 *     If undefined, the first command line argument will be used as application.
 *     If there are no command line arguments, module `main` in the current
 *     working directory is used.
 * @returns {Server} the Server instance.
 */
exports.init = function(path) {
    // parse command line options
    options = {};
    const args = system.args.slice(1);
    try {
        // remove command from command line arguments
        options = utils.parseOptions(args, options);
    } catch (error) {
        log.error("Error parsing options:", error);
        system.exit(1);
    }

    options.path = path;
    if (options.path === undefined) {
        if (args[0]) {
            // take app module from command line
            options.path = fs.resolve(fs.workingDirectory(), args[0]);
        } else {
            options.path = fs.workingDirectory();
        }
    }
    // if argument is a directory assume app in main.js
    if (fs.isDirectory(options.path)) {
        options.path = fs.join(options.path, "main");
    }

    log.info("Start app module at", options.path);

    httpServer = new HttpServer();
    httpServer.serveApplication("/", options.path);
    httpServer.createHttpListener(options);
    const app = require(options.path);
    if (typeof(app.init) === "function") {
        app.init(httpServer);
    }
    return httpServer;
};

/**
 * Daemon life cycle function invoked by init script. Starts the Server created
 * by `init()`. If the application exports a function called `start`, it will be
 * invoked with the server as argument immediately after it has started.
 *
 * @returns {Server} the Server instance.
 */
exports.start = function() {
    if (httpServer !== null && httpServer.isRunning()) {
        return httpServer;
    }
    httpServer.start();
    const app = require(options.path);
    if (typeof(app.start) === "function") {
        app.start(httpServer);
    }
    return httpServer;
};

/**
 * Daemon life cycle function invoked by init script. Stops the Server started
 * by `start()`.
 * @returns {Server} the Server instance. If the application exports a function
 * called `stop`, it will be invoked with the server as argument immediately
 * before it is stopped.
 *
 * @returns {Server} the Server instance.
 */
exports.stop = function() {
    if (httpServer !== null && !httpServer.isRunning()) {
        return httpServer;
    }
    const app = require(options.path);
    if (typeof app.stop === "function") {
        app.stop(httpServer);
    }
    httpServer.stop();
    return httpServer;
};

/**
 * Daemon life cycle function invoked by init script. Frees any resources
 * occupied by the Server instance.  If the application exports a function
 * called `destroy`, it will be invoked with the server as argument.
 *
 * @returns {Server} the Server instance.
 */
exports.destroy = function() {
    if (httpServer !== null) {
        const app = require(options.path);
        if (typeof(app.destroy) === "function") {
            app.destroy(httpServer);
        }
        httpServer.destroy();
    }
    try {
        return httpServer;
    } finally {
        httpServer = null;
    }
};

/**
 * Main function to start an HTTP server from the command line.
 * It automatically adds a shutdown hook which will stop and destroy the server at the JVM termination.
 *
 * @param {String} path optional application file name or module id.
 * @returns {Server} the Server instance.
 * @example // starts the current module via module.id as web application
 * require("ringo/httpserver").main(module.id);
 *
 * // starts the module "./app/actions" as web application
 * require("ringo/httpserver").main(module.resolve('./app/actions'));
 */
exports.main = function(path) {
    exports.init(path);
    exports.start();
    require("ringo/engine").addShutdownHook(function() {
        exports.stop();
        exports.destroy();
    });
    // return the server instance
    return httpServer;
};


if (require.main == module) {
    exports.main();
}
