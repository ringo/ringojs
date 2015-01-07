/**
 * @fileoverview This module provides an implementation of the system module
 * compliant to the <a href="http://wiki.commonjs.org/wiki/System/1.0">CommonJS
 * System/1.0</a> specification. Beyond the standard a <code>print()</code>
 * function is provided.
 */

var stdin, stdout, stderr;
var System = java.lang.System;

/**
 * A [TextStream](../io/#TextStream) to read from stdin.
 * @name stdin
 */
Object.defineProperty(exports, "stdin", {
    get: function() {
        if (!stdin) {
            var {Stream, TextStream} = require('io');
            stdin = new TextStream(new Stream(System['in']));
        }
        return stdin;
    },
    set: function(value) {
        stdin = value;
    }, configurable: true, enumerable: true
});

/**
 * A [TextStream](../io/#TextStream) to write to stdout.
 * @name stdout
 */
Object.defineProperty(exports, "stdout", {
    get: function() {
        if (!stdout) {
            var {Stream, TextStream} = require('io');
            stdout = new TextStream(new Stream(System.out));
        }
        return stdout;
    },
    set: function(value) {
        stdout = value;
    }, configurable: true, enumerable: true
});

/**
 * A [TextStream](../io/#TextStream) to write to stderr.
 * @name stderr
 */
Object.defineProperty(exports, "stderr", {
    get: function() {
        if (!stderr) {
            var {Stream, TextStream} = require('io');
            stderr = new TextStream(new Stream(System.err));
        }
        return stderr;
    },
    set: function(value) {
        stderr = value;
    }, configurable: true, enumerable: true
});

/**
 * A utility function to write to stdout.
 */
exports.print = function() {
    exports.stdout.print.apply(exports.stdout, arguments);
};

/**
 * An array of strings representing the command line arguments passed to the running script.
 * @example >> ringo .\myScript.js foo bar baz 12345
 * system.args -> ['.\myScript.js', 'foo', 'bar', 'baz', '12345']
 */
exports.args = global.arguments || [];

/**
 * An object containing of the current system environment.
 * @example {
 *   USERPROFILE: 'C:\Users\username',
 *   JAVA_HOME: 'C:\Program Files\Java\jdk1.7.0_07\',
 *   SystemDrive: 'C:',
 *   Path: '%System%/...',
 *   PROCESSOR_REVISION: '1a05',
 *   USERDOMAIN: 'EXAMPLE',
 *   SESSIONNAME: 'Console',
 *   TMP: 'C:\Temp',
 *   PROMPT: '$P$G',
 *   PROCESSOR_LEVEL: '6',
 *   LOCALAPPDATA: 'C:\Local',
 *   ...
 * }
 * @see <a href="http://docs.oracle.com/javase/7/docs/api/java/lang/System.html#getenv()">java.lang.System.getenv()</a>
 */
exports.env = new ScriptableMap(System.getenv());

/**
 * Terminates the current process.
 * @param {Number} status The exit status, defaults to 0.
 */
exports.exit = function(status) {
    System.exit(status || 0);
};