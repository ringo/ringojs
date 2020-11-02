/**
 * @fileoverview This module provides generic logging support for Ringo
 * applications. It uses <a href="http://www.slf4j.org/">SLF4J</a> or
 * <a href="http://logging.apache.org/log4j/">Apache log4j</a> if either is
 * detected in the classpath, and will fall back to java.util.logging
 * otherwise.
 *
 * If the first argument passed to any of the logging methods is a string
 * containing any number of curly bracket pairs ({}), the logger will interpret
 * it as format string and use any following arguments to replace the curly
 * bracket pairs. If an argument is an Error or Java Exception object, the
 * logger will render a stack trace for it and append it to the log message.
 *
 * This module's exports object implements the <a href="../events/index.html">EventEmitter</a>
 * interface and emits logged messages using the log level name as event type.
 *
 * @example // Get a Logger for the current module
 * const log = require('ringo/logging').getLogger(module.id);
 *
 * log.debug('Connected to ', url, ' [GET]');
 * log.error('This should not occur');
 * log.info('Info message');
 * log.info('User {} accessed {}', username, resource);
 * log.warn('A warning');
 *
 */

const strings = require('ringo/utils/strings');
const {EventEmitter} = require('ringo/events');

// Use singleton to share flag across workers to avoid unwanted reconfiguration
let configured = module.singleton("configured");

const isVerbose = require('ringo/engine').getRhinoEngine().getConfig().isVerbose();

// Make exports object emit log events
EventEmitter.call(exports);

/**
 * Logger class. This constructor is not exported, use this module's
 * {@link getLogger} to get a logger instance.
 * @param {String} name the Logger name
 * @param {Object} impl the logger implementation
 * @constructor
 * @name Logger
 * @see #getLogger()
 */
function Logger(name, impl) {

    this.trace = function() {
        if (impl.isTraceEnabled()) {
            const msg = formatMessage(arguments);
            impl.trace(msg);
            exports.emit("trace", name, msg);
        }
    };

    this.debug = function() {
        if (impl.isDebugEnabled()) {
            const msg = formatMessage(arguments);
            impl.debug(msg);
            exports.emit("debug", name, msg);
        }
    };

    this.info = function() {
        if (impl.isInfoEnabled()) {
            const msg = formatMessage(arguments);
            impl.info(msg);
            exports.emit("info", name, msg);
        }
    };

    this.warn = function() {
        if (impl.isWarnEnabled()) {
            const msg = formatMessage(arguments);
            impl.warn(msg);
            exports.emit("warn", name, msg);
        }
    };

    this.error = function() {
        if (impl.isErrorEnabled()) {
            const msg = formatMessage(arguments);
            impl.error(msg);
            exports.emit("error", name, msg);
        }
    };

    /**
     * @function
     */
    this.isTraceEnabled = () => impl.isTraceEnabled;

    /**
     * @function
     */
    this.isDebugEnabled = () => impl.isDebugEnabled;

    /**
     * @function
     */
    this.isInfoEnabled = () => impl.isInfoEnabled;

    /**
     * @function
     */
    this.isWarnEnabled = () => impl.isWarnEnabled;

    /**
     * @function
     */
    this.isErrorEnabled = () => impl.isErrorEnabled;
}

/**
 * Configure log4j using the given file resource.
 *
 * If you plan to update the configuration make sure to set the
 * reset property to true in your configuration file.
 *
 * @param {Resource} resource the configuration resource in XML or properties format
 * @param {Boolean} watchForUpdates if true a scheduler thread is started that
 * repeatedly checks the resource for updates.
 */
const setConfig = exports.setConfig = function(resource) {
    var logContext = org.apache.logging.log4j.LogManager.getContext(false);
    logContext.setConfigLocation(new java.net.URI(resource.url));
    logContext.updateLoggers();
    configured = module.singleton("configured", () => true);
};

/**
 * Get a logger for the given name.
 * @param {String} name the name of the logger
 * @returns {Logger} a logger instance for the given name
 */
const getLogger = exports.getLogger = (name) => {
    name = name.replace(/\//g, '.');
    return new Logger(name, new LoggerImpl(name));
};

const formatMessage = (args) => {
    let message = strings.format.apply(null, args);
    Array.prototype.forEach.call(args, (arg) => {
        if (arg instanceof Error || arg instanceof java.lang.Throwable) {
            message  = [
                message,
                getScriptStack(arg, "\nScript stack:\n"),
                isVerbose ? getJavaStack(arg, "Java stack:\n") : null
            ].join('');
        }
    });
    return message;
};

/**
 * Get a rendered JavaScript stack trace from a caught error.
 * @param {Error} error an error object
 * @param {String} prefix to prepend to result if available
 * @return {String} the rendered JavaScript stack trace
 */
const getScriptStack = exports.getScriptStack = (error, prefix) => {
    prefix = prefix || "";
    if (error && error.stack) {
        return prefix + error.stack;
    }
    return "";
};

/**
 * Get a rendered JavaScript stack trace from a caught error.
 * @param {Error} error an error object
 * @param {String} prefix to prepend to result if available
 * @return {String} the rendered JavaScript stack trace
 */
const getJavaStack = exports.getJavaStack = (error, prefix) => {
    prefix = prefix || "";
    const exception = (error && error.rhinoException) ?
        error.rhinoException : error;
    if (exception instanceof java.lang.Throwable) {
        const writer = new java.io.StringWriter();
        const printer = new java.io.PrintWriter(writer);
        exception.printStackTrace(printer);
        return prefix + writer.toString();
    }
    return "";
};

/**
 * Logger implementation based on java.util.logging
 * @param {String} name the logger name
 */
const JdkLogger = function(name) {

    const log = java.util.logging.Logger.getLogger(name);
    const Level = java.util.logging.Level;

    this.trace = (msg) => log.logp(Level.FINEST, null, null, msg);

    this.debug = (msg) => log.logp(Level.FINE, null, null, msg);

    this.info = (msg) => log.logp(Level.INFO, null, null, msg);

    this.warn = (msg) => log.logp(Level.WARNING, null, null, msg);

    this.error = (msg) => log.logp(Level.SEVERE, null, null, msg);

    this.isTraceEnabled = () => log.isLoggable(Level.FINEST);

    this.isDebugEnabled = () => log.isLoggable(Level.FINE);

    this.isInfoEnabled = () => log.isLoggable(Level.INFO);

    this.isWarnEnabled = () => log.isLoggable(Level.WARNING);

    this.isErrorEnabled = () => log.isLoggable(Level.SEVERE);

    return this;
};

/**
 * Logger implementation based on log4j
 * @param {String} name the logger name
 */
const Log4jLogger = function(name) {

    if (!configured) {
        setConfig(getResource('config/log4j2.properties'));
    }
    const log = org.apache.logging.log4j.LogManager.getLogger(name);

    this.trace = (msg) => log.trace(msg);

    this.debug = (msg) => log.debug(msg);

    this.info = (msg) => log.info(msg);

    this.warn = (msg) => log.warn(msg);

    this.error = (msg) =>log.error(msg);

    this.isTraceEnabled = () => log.isTraceEnabled();

    this.isDebugEnabled = () => log.isDebugEnabled();

    this.isInfoEnabled = () => log.isInfoEnabled();

    this.isWarnEnabled = () => log.isWarnEnabled();

    this.isErrorEnabled = () => log.isErrorEnabled();

    return this;
};

/**
 * Logger implementation based on SLF4J
 * @param {String} name the logger name
 */
const Slf4jLogger = function(name) {

    if (!configured) {
        setConfig(getResource('config/log4j2.properties'));
    }
    const log = org.slf4j.LoggerFactory.getLogger(name);

    this.trace = (msg) => log.trace(msg);

    this.debug = (msg) => log.debug(msg);

    this.info = (msg) => log.info(msg);

    this.warn = (msg) => log.warn(msg);

    this.error = (msg) => log.error(msg);

    this.isTraceEnabled = () => log.isTraceEnabled();

    this.isDebugEnabled = () => log.isDebugEnabled();

    this.isInfoEnabled = () => log.isInfoEnabled();

    this.isWarnEnabled = () => log.isWarnEnabled();

    this.isErrorEnabled = () => log.isErrorEnabled();

    return this;
};

let LoggerImpl;
if (typeof org.slf4j.LoggerFactory.getLogger === "function") {
    LoggerImpl = Slf4jLogger;
} else if (typeof org.apache.logging.log4j.LogManager.getLogger === "function") {
    LoggerImpl = Log4jLogger;
} else {
    LoggerImpl = JdkLogger;
}
