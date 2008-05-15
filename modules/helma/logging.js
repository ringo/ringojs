importModule('core.string');

var __shared__ = true;
var configured = false;

/**
 * Configure log4j using the given file resource.
 * Make sure to set the reset property to true in the <log4j:configuration> header
 * e.g. <log4j:configuration xmlns:log4j='http://jakarta.apache.org/log4j/' reset="true">
 */
function setConfig(resource) {
    if (resource.endsWith('.properties') || resource.endsWith('.props')) {
       org.apache.log4j.PropertyConfigurator.configureAndWatch(resource);
    } else {
       org.apache.log4j.xml.DOMConfigurator.configureAndWatch(resource);
    }
    configured = true;
}

/**
 * Get a logger for the given name.
 */
function getLogger(name) {
    if (!configured) {
        org.apache.log4j.BasicConfigurator.configure();
        configured = true;
    }
    return org.apache.log4j.Logger.getLogger(name);
}
