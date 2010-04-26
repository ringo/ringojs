/**
 * @fileoverview <p>This module provides generic logging support. It uses
 * <a href="http://logging.apache.org/log4j/">Apache log4j</a> by default,
 * but can be used with any Logging framework supported by
 * <a href="http://www.slf4j.org/">SLF4J</a>.<p>
 *
 * <p>If the first argument passed to any of the logging methods is a string
 * containing any number of curly bracket pairs ({}), the logger will interpret
 * it as format string and use any following arguments to replace the curly
 * bracket pairs. If an argument is an Error or Java Exception object, the
 * logger will render a stack trace for it and append it to the log message.</p>
 */

require('core/string');
var utils = require('ringo/utils');

var LoggerFactory = org.slf4j.LoggerFactory;

module.shared = true;
var configured = false;
// interval id for configuration watcher
var configurationWatcher;

var interceptors = new java.lang.ThreadLocal();

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
        if (log.isTraceEnabled()) {
            var msg = formatMessage(arguments);
            log.trace(msg);
            intercept("TRACE", log, msg);
        }
    };

    this.debug = function() {
        if (log.isDebugEnabled()) {
            var msg = formatMessage(arguments);
            log.debug(msg);
            intercept("DEBUG", log, msg);
        }
    };

    this.info = function() {
        if (log.isInfoEnabled()) {
            var msg = formatMessage(arguments);
            log.info(msg);
            intercept("INFO", log, msg);
        }
    };

    this.warn = function() {
        if (log.isWarnEnabled()) {
            var msg = formatMessage(arguments);
            log.warn(msg);
            intercept("WARN", log, msg);
        }
    };

    this.error = function() {
        if (log.isErrorEnabled()) {
            var msg = formatMessage(arguments);
            log.error(msg);
            intercept("ERROR", log, msg);
        }
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
    var PropertyConfigurator = org.apache.log4j.PropertyConfigurator;
    var DOMConfigurator = org.apache.log4j.xml.DOMConfigurator;
    var configurator = path.endsWith('.properties') || path.endsWith('.props') ?
                       PropertyConfigurator : DOMConfigurator;
    if (typeof configurator.configure === "function") {
        configurator.configure(url);
        try {
            // set up a scheduler to watch the configuration file for changes
            var {setInterval, clearInterval} = require("./scheduler");
            var lastModified = resource.lastModified();
            if (configurationWatcher) {
                clearInterval(configurationWatcher);
            }
            configurationWatcher = setInterval(function() {
                if (resource.exists() && resource.lastModified() != lastModified) {
                    lastModified = resource.lastModified();
                    configurator.configure(url);
                }
            }, 3000);
        } catch (e) {
            print("Error watching log configuration file:", e);
        }
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

/**
 * Use array as log message interceptor for the current thread.
 * @param array an array
 */
exports.setInterceptor = function(array) {
    interceptors.set(array);
};

/**
 * Return the log message interceptor for the current thread,
 * or null if none is set.
 * @return the interceptor array
 */
exports.getInterceptor = function() {
    return interceptors.get();
};

function intercept(level, log, message) {
    var interceptor = interceptors.get();
    if (interceptor) {
        interceptor.push([Date.now(), level, log.getName(), message]);
    }
}

function formatMessage(args) {
    var message = utils.format.apply(null, args);
    for each (var arg in args) {
        if (arg instanceof Error || arg instanceof java.lang.Throwable) {
            message  = [
                message,
                utils.getScriptStack(arg, "\nScript stack:\n"),
                utils.getJavaStack(arg, "Java stack:\n")
            ].join('');
        }
    }
    return message;
}

