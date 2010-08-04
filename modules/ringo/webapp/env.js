/**
 * @fileOverview This module can be used to lookup the current
 * JSGI request and config module in a web application.
 */

var OBJECT = require('ringo/utils/object');
var fileutils = require('ringo/fileutils');

var current = current || new java.lang.ThreadLocal();

exports.setRequest = function(req) {
    current.set({
        request: req,
        configs: [],
        configIds: []
    });
};

exports.getRequest = function() {
    return current.get().request;
};

/**
 * Adds a config module to the config module array and sets it as the
 * current module.
 */
exports.pushConfig = function(config, configId) {
    var curr = current.get();
    curr.configs.push(config);
    curr.configIds.push(configId);
};

exports.getConfigs = function() {
    return current.get().configs;
};

exports.reset = function() {
    current.remove();
};

exports.loadMacros = function(context) {
    var curr = current.get();
    for (var i = 0; i < curr.configs.length; i++) {
        var config = curr.configs[i];
        if (config && Array.isArray(config.macros)) {
            for each (var moduleId in config.macros) {
                context = OBJECT.merge(context,
                        loadModule(moduleId, curr.configIds[i]));
            }
        }
    }
    return context;
};

function loadModule(moduleId, parent) {
    if (typeof moduleId == "string") {
        return require(fileutils.resolveId(parent, moduleId));
    } else {
        return moduleId;
    }
}
