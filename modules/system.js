/**
 * @fileoverview <p>This module provides an implementation of the system module
 * compliant to the <a href="http://wiki.commonjs.org/wiki/System/1.0">CommonJS
 * System/1.0</a> specification.</p>
 *
 * <p>Beyond the standard, a "print" function and some properties for Narwhal
 * compatibility are provided.</p>
 */

var io = require('io');
module.shared = true;

/**
 * An io.TextStream to read from stdin.
 */
exports.stdin = new io.TextStream(new io.Stream(java.lang.System['in']));


/**
 * An io.TextStream to write to stdout.
 */
exports.stdout = new io.TextStream(new io.Stream(java.lang.System.out));

/**
 * An io.TextStream to write to stderr.
 */
exports.stderr = new io.TextStream(new io.Stream(java.lang.System.err));

/**
 * A utility function to write to stdout.
 */
exports.print = function() {
    exports.stdout.print.apply(exports.stdout, arguments);
};

/**
 * An array of strings representing the command line arguments passed to the running script.
 */
exports.args = global.arguments || [];

/**
 * An object containing our environment variables.
 */
exports.env = new ScriptableMap(java.lang.System.getenv());

// Narwhal compatibility
var engine = org.ringojs.engine.RhinoEngine.getEngine();
var home = engine.getRingoHome();
/** @ignore */
exports.prefix = home.getPath();
/** @ignore */
exports.prefixes = [exports.prefix];
/** @ignore */
exports.engine = "rhino";
/** @ignore */
exports.engines = ["rhino", "default"];
