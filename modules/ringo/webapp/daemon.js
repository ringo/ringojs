/**
 * @fileoverview: The webapp daemon control script invoked by
 * the Apache Commons Daemon jsvc tool.
 */

var Server = require('ringo/httpserver').Server;
var server, options;
var log = require('ringo/logging').getLogger(module.id);
var fileutils = require('ringo/fileutils');

export('init', 'start', 'stop', 'destroy', 'getServer');


// parse command line options
var parser = new (require('ringo/args').Parser);
parser.addOption("a", "app", "APP", "The exported property name of the JSGI app (default: 'app')");
parser.addOption("c", "config", "MODULE", "The module containing the JSGI app (default: 'config')");
parser.addOption("H", "host", "HOST", "The host name to bind to (default: 0.0.0.0)");
parser.addOption("m", "mountpoint", "PATH", "The URI path where to mount the application (default: /)");
parser.addOption("p", "port", "PORT", "The TCP port to listen on (default: 80)");
parser.addOption("s", "staticDir", "DIR", "A directory with static resources to serve");
parser.addOption("S", "staticMountpoint", "PATH", "The URI path where ot mount the static resources");

function init() {
    log.info("init");
    options = parser.parse(Array.slice(arguments, 1), {
        config: "config",
        app: "app",
        port: 80
    });
    options.moduleName = options.config;
    options.functionName = options.app;
    server = new Server(options);
}

function start() {
    log.info("start");
    var config = require(options.config);
    if (Array.isArray(config.static)) {
        config.static.forEach(function(spec) {
            var dir = fileutils.resolveId(options.config, spec[1]);
            server.addStaticResources(spec[0], null, dir);
        });
    }
    server.start();
}

function stop() {
    log.info("stop");
    server.stop();
}

function destroy() {
    log.info("destroy");
    server.destroy();
}

function getServer() {
    return server;
}