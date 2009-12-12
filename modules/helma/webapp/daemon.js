/**
 * @fileoverview: The webapp daemon control script invoked by
 * the Apache Commons Daemon jsvc tool.
 */

var Server = require('helma/httpserver').Server;
var server;
var log = require('helma/logging').getLogger(module.id);

export('init', 'start', 'stop', 'destroy');


// parse command line options
var parser = new (require('helma/args').Parser);
parser.addOption("a", "app", "APP", "The exported property name of the JSGI app (default: 'app')");
parser.addOption("c", "config", "MODULE", "The module containing the JSGI app (default: 'config')");
parser.addOption("H", "host", "HOST", "The host name to bind to (default: 0.0.0.0)");
parser.addOption("m", "mountpoint", "PATH", "The URI path where to mount the application (default: /)");
parser.addOption("p", "port", "PORT", "The TCP port to listen on (default: 80)");
parser.addOption("s", "staticDir", "DIR", "A directory with static resources to serve");
parser.addOption("S", "staticMountpoint", "PATH", "The URI path where ot mount the static resources");

function init() {
    log.info("init");
    var options = parser.parse(Array.slice(arguments, 1), {
        moduleName: "config",
        functionName: "app",
        port: 80
    });
    server = new Server(options);
}

function start() {
    log.info("start");
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