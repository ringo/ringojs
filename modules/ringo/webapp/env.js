/**
 * This is a module that is loaded per-request and provides the current
 * webapp JSGI env, request, and config objects to other modules.
 *
 * Note that this module should be loaded within the function that uses
 * it to make sure we get a fresh version. Otherwise, the state of the
 * loaded module will depend on whether the loading module is shared or not.
 */

/**
 * Adds a config module to the config module array and sets it as the
 * current module.
 */
exports.addConfig = function(config) {
    if (!exports.configs) {
        exports.configs = [config];
    } else {
        exports.configs.push(config);
    }
    exports.config = config;
}
