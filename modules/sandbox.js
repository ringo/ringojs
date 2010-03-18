/**
 * @fileoverview A compatibility module for Narwhal's sandbox.
 * RingoJS is auto-reloading by default, so this is just a proxy
 * to require().
 */

var fs = require('fs-base');

exports.Sandbox = function(options) {
    return require;
};

exports.sandbox = function(main, system, options) {
    var {prefix, print} = options;
    var engine = require('ringo/engine');
    var sandbox = engine.createSandbox(
            [prefix],
            {print: print},
            {includeSystemModules: true}
    );
    // check for missing .js extension
    var path = fs.join(prefix, main);
    if (!fs.exists(path)) {
        path = fs.join(prefix, main + ".js");
    }
    return sandbox.runScript(path);
};
