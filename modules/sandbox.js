/**
 * @fileoverview A compatibility module for Narwhal's sandbox.
 * RingoJS is auto-reloading by default, so this is just a proxy
 * to require().
 * @ignore
 */

exports.Sandbox = function(options) {
    return require;
};
