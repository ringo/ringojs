/**
 * @fileoverview This module provides generic logging support. It uses
 * <a href="http://logging.apache.org/log4j/">Apache log4j</a> by default,
 * but can be used with any Logging framework supported by
 * <a href="http://www.slf4j.org/">SLF4J</a>.
 */

require('core/string');

var LoggerFactory = org.slf4j.LoggerFactory;

module.shared = true;
var configured = false;

/**
 * Logger class. This constructor is not exported, use this module's
 * {@link getLogger} to get a logger instance. 
 * @param name
 * @constructor
 * @name Logger
 * @see getLogger
 */
function Logger(name) {

    var log = LoggerFactory.getLogger(name.replace(/\//g, '.'));

    /**
     * Log a debug message.
     */
    this.trace = function() {
        log.trace.apply(log, arguments);
    };

    this.debug = function() {
        log.debug.apply(log, arguments);
    };

    this.info = function() {
        log.info.apply(log, arguments);
    };

    this.warn = function() {
        log.warn.apply(log, arguments);
    };

    this.error = function() {
        log.error.apply(log, arguments);
    };

    this.isTraceEnabled = function() {
        return log.isTraceEnabled();
    };

    this.isDebugEnabled = function() {
        return log.isDebugEnabled();
    };

    this.isInfoEnabled = function() {
        return log.isInfoEnabled();
    };

    this.isWarnEnabled = function() {
        return log.isWarnEnabled();
    };

    this.isErrorEnabled = function() {
        return log.isErrorEnabled();
    };
}

/**
 * Configure log4j using the given file resource.
 * Make sure to set the reset property to true in the <log4j:configuration> header
 * e.g. <log4j:configuration xmlns:log4j='http://jakarta.apache.org/log4j/' reset="true">
 */
var setConfig = exports.setConfig = function(resource) {
    var {path, url} = resource;
    var PropertyConfigurator = org.apache.log4j.PropertyConfigurator,
        DOMConfigurator = org.apache.log4j.xml.DOMConfigurator;
    var configurator = path.endsWith('.properties') || path.endsWith('.props') ?
                       PropertyConfigurator : DOMConfigurator;
    configurator.configure(url);
    try {
        configurator.configureAndWatch(path, 2000);
    } catch (e) {
        print("Error watching log configuration file:", e);
    }
    configured = true;
};

/**
 * Get a logger for the given name. 
 * @param {string} name the name of the logger
 * @returns {Logger} a logger instance for the given name
 */
var getLogger = exports.getLogger = function(name) {
    if (!configured) {
        // getResource('foo').name gets us the absolute path to a local resource
        this.setConfig(getResource('config/log4j.properties'));
    }
    return new Logger(name);
};

