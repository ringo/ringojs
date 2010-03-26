/**
 * @fileoverview: The webapp daemon control script invoked by
 * the Apache Commons Daemon jsvc tool.
 */

var system = require('system');
var Server = require('ringo/httpserver').Server;
var server, options;
var log = require('ringo/logging').getLogger(module.id);
var fileutils = require('ringo/fileutils');

export('init', 'start', 'stop', 'destroy', 'getServer');


// parse command line options
var parser = new (require('ringo/args').Parser);
parser.addOption("a", "app", "APP", "The exported property name of the JSGI app (default: 'app')");
parser.addOption("c", "config", "MODULE", "The module containing the JSGI app (default: 'config')");
parser.addOption("j", "jetty-config", "PATH", "The jetty xml configuration file (default. 'config/jetty.xml')");
parser.addOption("H", "host", "ADDRESS", "The IP address to bind to (default: 0.0.0.0)");
parser.addOption("m", "mountpoint", "PATH", "The URI path where to mount the application (default: /)");
parser.addOption("p", "port", "PORT", "The TCP port to listen on (default: 80)");
parser.addOption("s", "static-dir", "DIR", "A directory with static resources to serve");
parser.addOption("S", "static-mountpoint", "PATH", "The URI path where ot mount the static resources");
// parser.addOption("v", "virtual-host", "VHOST", "The virtual host name (default: undefined)");
parser.addOption("h", "help", null, "Print help message to stdout");

function init() {
    log.info("init");
    options = {
        config: "config",
        app: "app",
        port: 80
    };
    parser.parse(Array.slice(system.args, 1), options);
    if (options.help) {
        print("Available options:");
        print(parser.help());
    }
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