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
}

/**
 * An array of strings representing the command line arguments passed to the running script.
 */
exports.args = global.arguments || [];

/**
 * An object containing our environment variables.
 */
exports.env = new ScriptableMap(java.lang.System.getenv());