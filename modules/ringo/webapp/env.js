/**
 * @fileOverview This module can be used to lookup the current
 * JSGI request and config module in a web application.
 */

var objects = require('ringo/utils/objects');
var files = require('ringo/utils/files');

var current = current || new java.lang.ThreadLocal();

/**
 * Registers a request with the current thread
 * @param req a JSGI request object
 */
exports.setRequest = function(req) {
    current.set({
        request: req,
        configs: [],
        configIds: []
    });
};

/**
 * Registers a nested config module to the configs array and
 * sets it as the current module. This throws an Error if no
 * request is associated with the current thread.
 */
exports.pushConfig = function(config, configId) {
    var curr = current.get();
    if (!curr) {
        throw new Error("No request registered with current thread");
    }
    curr.config = config;
    curr.configs.push(config);
    curr.configIds.push(configId);
};

/**
 * Get the request associated with the current thread.
 */
exports.getRequest = function() {
    var curr = current.get();
    return curr ? curr.request : null;
};

/**
 * Get the config module associated with the current thread.
 */
exports.getConfig = function() {
    var curr = current.get();
    return curr ? curr.config : null;
};

/**
 * Get an array containing all config modules associated with the
 * current thread.
 */
exports.getConfigs = function() {
    var curr = current.get();
    return curr ? curr.configs : null;
};

/**
 * Unregister any request and config objects previously associated with
 * the current request.
 */
exports.reset = function() {
    current.remove();
};

exports.loadMacros = function(context) {
    var curr = current.get();
    for (var i = 0; curr && i < curr.configs.length; i++) {
        var config = curr.configs[i];
        if (config && Array.isArray(config.macros)) {
            for each (var moduleId in config.macros) {
                context = objects.merge(context,
                        loadModule(moduleId, curr.configIds[i]));
            }
        }
    }
    return context;
};

function loadModule(moduleId, parent) {
    if (typeof moduleId == "string") {
        return require(files.resolveId(parent, moduleId));
    } else {
        return moduleId;
    }
}
