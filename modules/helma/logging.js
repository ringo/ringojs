require('core/string');

importPackage(org.apache.log4j);
importClass(org.apache.log4j.xml.DOMConfigurator);

module.shared = true;
var configured = false;

/**
 * Configure log4j using the given file resource.
 * Make sure to set the reset property to true in the <log4j:configuration> header
 * e.g. <log4j:configuration xmlns:log4j='http://jakarta.apache.org/log4j/' reset="true">
 */
var setConfig = exports.setConfig = function(resource) {
    var {path, url} = resource;
    var configurator = path.endsWith('.properties') || path.endsWith('.props') ?
                       PropertyConfigurator : DOMConfigurator;
    configurator.configure(url);
    try {
        configurator.configureAndWatch(path, 2000);
    } catch (e) {
        print("Error watching log configuration file:", e);
    }
    configured = true;
}

/**
 * Get a logger for the given name.
 */
var getLogger = exports.getLogger = function(name) {
    if (!configured) {
        // getResource('foo').name gets us the absolute path to a local resource
        this.setConfig(getResource('config/log4j.properties'));
    }
    return Logger.getLogger(name.replace(/\//g, '.'));
}

