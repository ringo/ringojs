/**
 * @fileoverview This module provides an implementation of the system module
 * compliant to the <a href="http://wiki.commonjs.org/wiki/System/1.0">CommonJS
 * System/1.0</a> specification. Beyond the standard a <code>print()</code>
 * function is provided.
 */

const {System} = java.lang;
let stdin, stdout, stderr;

/**
 * A [TextStream](../io/#TextStream) to read from stdin.
 * @name stdin
 */
Object.defineProperty(exports, "stdin", {
    get: () => {
        if (!stdin) {
            const {Stream, TextStream} = require('io');
            stdin = new TextStream(new Stream(System['in']));
        }
        return stdin;
    },
    set: (value) => {
        stdin = value;
    },
    configurable: true,
    enumerable: true
});

/**
 * A [TextStream](../io/#TextStream) to write to stdout.
 * @name stdout
 */
Object.defineProperty(exports, "stdout", {
    get: () => {
        if (!stdout) {
            const {Stream, TextStream} = require('io');
            stdout = new TextStream(new Stream(System.out));
        }
        return stdout;
    },
    set: (value) => {
        stdout = value;
    },
    configurable: true,
    enumerable: true
});

/**
 * A [TextStream](../io/#TextStream) to write to stderr.
 * @name stderr
 */
Object.defineProperty(exports, "stderr", {
    get: () => {
        if (!stderr) {
            const {Stream, TextStream} = require('io');
            stderr = new TextStream(new Stream(System.err));
        }
        return stderr;
    },
    set: (value) => {
        stderr = value;
    },
    configurable: true,
    enumerable: true
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
 *   JAVA_HOME: 'C:\Program Files\Java\jdk\',
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
 * @see <a href="https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/System.html#getenv()">java.lang.System.getenv()</a>
 */
exports.env = new ScriptableMap(System.getenv());

/**
 * @name properties
 * Returns an unmodifiable view on the current Java system properties.
 * @example {
 *   gopherProxySet: 'false',
 *   awt.toolkit: 'sun.lwawt.macosx.LWCToolkit',
 *   java.specification.version: '11',
 *   sun.cpu.isalist: '',
 *   sun.jnu.encoding: 'UTF-8',
 *   java.class.path: '/Users/nobody/ringojs/run.jar',
 *   java.vm.vendor: 'Eclipse Adoptium',
 *   sun.arch.data.model: '64',
 *   java.vendor.url: 'https://adoptium.net/',
 *   user.timezone: 'Europe/Vienna',
 *   ...
 * }
 * @see <a href="https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/System.html#getProperties()">java.lang.System.getProperties()</a>
 */
Object.defineProperty(exports, "properties", {
    get: () => {
        return new ScriptableMap(java.util.Collections.unmodifiableMap(System.getProperties()));
    }
});

/**
 * Terminates the current process.
 * @param {Number} status The exit status, defaults to 0.
 */
exports.exit = function(status) {
    System.exit(status || 0);
};
