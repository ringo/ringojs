/**
 * This is a module that is loaded per-request and provides the current
 * webapp JSGI env, request, and config objects to other modules.
 *
 * Note that this module should be loaded within the function that uses
 * it to make sure we get a fresh version. Otherwise, the state of the
 * loaded module will depend on whether the loading module is shared or not.
 */

require('core/string');
var fileutils = require('ringo/fileutils');

module.shared = false;

var request;
var configs = [];
var configIds = [];

exports.setRequest = function(req) {
    request = req;
};

exports.getRequest = function() {
    return request;
};

/**
 * Adds a config module to the config module array and sets it as the
 * current module.
 */
exports.pushConfig = function(config, configId) {
    configs.push(config);
    configIds.push(configId);
    exports.config = config;
};

exports.getConfigs = function() {
    return configs;
};

exports.getConfig = function() {
    return config;
};

exports.reset = function() {
    configs = [];
    configIds = [];
};

exports.loadMacros = function(context) {
    for (var i = 0; i < configs.length; i++) {
        var config = configs[i];
        if (config && Array.isArray(config.macros)) {
            for each (var moduleId in config.macros) {
                context = Object.merge(context,
                        loadModule(moduleId, configIds[i]));
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
