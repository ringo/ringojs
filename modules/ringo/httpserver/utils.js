/**
 * @ignore
 */
const {Parser} = require("ringo/args");
const system = require("system");

exports.parseOptions = function(args, defaults) {
    const parser = new Parser();

    parser.addOption("a", "app-name", "APP", "The exported property name of the JSGI app (default: 'app')");
    parser.addOption("j", "jetty-config", "PATH", "The jetty xml configuration file (default. 'config/jetty.xml')");
    parser.addOption("H", "host", "ADDRESS", "The IP address to bind to (default: 0.0.0.0)");
    parser.addOption("m", "mountpoint", "PATH", "The URI path where to mount the application (default: /)");
    parser.addOption("p", "port", "PORT", "The TCP port to listen on (default: 80)");
    parser.addOption("s", "static-dir", "DIR", "A directory with static resources to serve");
    parser.addOption("S", "static-mountpoint", "PATH", "The URI path where ot mount the static resources");
    parser.addOption("v", "virtual-host", "VHOST", "The virtual host name (default: undefined)");
    parser.addOption("h", "help", null, "Print help message to stdout");

    const options = parser.parse(args, defaults);
    if (options.help) {
        print("Usage:");
        print("", cmd, "[OPTIONS]", "[PATH]");
        print("Options:");
        print(parser.help());
        system.exit(0);
    } else if (options.port && !isFinite(options.port)) {
        const port = parseInt(options.port, 10);
        if (isNaN(port) || port < 1) {
            throw new Error("Invalid value for port: " + options.port);
        }
        options.port = port;
    }

    return options;
};
