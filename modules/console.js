/**
 * @fileOverview This module provides functions to write on the standard output stream <code>stdout</code>
 * and error stream <code>stderr</code> for error logging and quick debugging.
 * It’s similar to the console object implemented in most web browsers.
 */
var {TermWriter, BOLD, ONRED, ONYELLOW, RESET} = require("ringo/term");

var writer = new TermWriter(require("system").stdout);
var errWriter = new TermWriter(require("system").stderr);

var timers = {};
var {traceHelper, assertHelper} = org.ringojs.util.ScriptUtils;

function format() {
    var msg = arguments[0] ? String(arguments[0]) : "";
    var pattern = /%[sdifo]/;
    for (var i = 1; i < arguments.length; i++) {
        msg = pattern.test(msg)
                ? msg.replace(pattern, String(arguments[i]))
                : msg + " " + arguments[i];
    }
    return msg;
}

/**
 * Logs a message to the console on <code>stdout</code>.
 *
 * The first argument to log may be a string containing printf-like placeholders.
 * Otherwise, multipel arguments will be concatenated separated by spaces.
 * @param {*...} msg... one or more message arguments
 * @example >> console.log('Hello World!');
 * Hello World!
 * >> console.log('A: %s, B: %s, C: %s', 'a', 'b', 'c');
 * A: a, B: b, C: c
 * >> console.log('Current nanoseconds: %d', java.lang.System.nanoTime());
 * Current nanoseconds: 9607196939209
 */
exports.log = function() {
    var msg = format.apply(null, arguments);
    writer.writeln(msg);
};

/**
 * Logs a message with the visual "error" representation, including the file name
 * and line number of the calling code. Prints on <code>stderr</code>.
 * @param {*...} msg... one or more message arguments
 * @function
 * @example >> console.error('Hello World!');
 * [error] Hello World! (&#60;stdin&#62;:1)
 * >> console.error('A: %s, B: %s, C: %s', 'a', 'b', 'c');
 * [error] A: a, B: b, C: c (&#60;stdin&#62;:3)
 * >> console.error('Current nanoseconds: %d', java.lang.System.nanoTime());
 * [error] Current nanoseconds: 9228448561643 (&#60;stdin&#62;:5)
 */
exports.error = traceHelper.bind(null, function() {
    var msg = format.apply(null, arguments);
    var location = format("(%s:%d)", this.sourceName(), this.lineNumber());
    errWriter.writeln(ONRED, BOLD, "[error]" + RESET, BOLD, msg, RESET, location);
});

/**
 * Logs a message with the visual "warn" representation, including the file name
 * and line number of the calling code. Prints on <code>stderr</code>.
 * @param {*...} msg... one or more message arguments
 * @function
 * @example >> console.warn('Hello World!');
 * [warn] Hello World! (&#60;stdin&#62;:1)
 * >> console.warn('A: %s, B: %s, C: %s', 'a', 'b', 'c');
 * [warn] A: a, B: b, C: c (&#60;stdin&#62;:3)
 * >> console.warn('Current nanoseconds: %d', java.lang.System.nanoTime());
 * [warn] Current nanoseconds: 9294672097821 (&#60;stdin&#62;:5)
 */
exports.warn = traceHelper.bind(null, function() {
    var msg = format.apply(null, arguments);
    var location = format("(%s:%d)", this.sourceName(), this.lineNumber());
    errWriter.writeln(ONYELLOW, BOLD, "[warn]" + RESET, BOLD, msg, RESET, location);
});

/**
 * Logs a message with the visual "info" representation, including the file name
 * and line number of the calling code. Prints on <code>stdout</code>.
 * @param {*...} msg... one or more message arguments
 * @function
 * @example >> console.info('Hello World!');
 * [info] Hello World! (&#60;stdin&#62;:1)
 * >> console.info('A: %s, B: %s, C: %s', 'a', 'b', 'c');
 * [info] A: a, B: b, C: c (&#60;stdin&#62;:3)
 * >> console.info('Current nanoseconds: %d', java.lang.System.nanoTime());
 * [info] Current nanoseconds: 9677228481391 (&#60;stdin&#62;:5)
 */
exports.info = traceHelper.bind(null, function() {
    var msg = format.apply(null, arguments);
    var location = format("(%s:%d)", this.sourceName(), this.lineNumber());
    writer.writeln("[info]", BOLD, msg, RESET, location);
});

/**
 * Prints a stack trace of JavaScript execution at the point where it is called.
 * Prints on <code>stdout</code>.
 * @param {*...} msg... optional message arguments
 * @function
 */
exports.trace = traceHelper.bind(null, function() {
    var msg = format.apply(null, arguments);
    writer.writeln("Trace: " + msg);
    writer.write(this.scriptStackTrace);
});

/**
 * Tests that an expression is true and throws an <code>AssertionError</code>
 * exception if not. It uses the ECMAScript <code>toBoolean()</code> convertion.
 * @param {Boolean} expression the expression to test
 * @param {*...} msg... one or more error messages
 * @function
 * @example >> var x = 10;
 * >> console.assert(x > 0, 'failed!'); // passes
 * >> console.assert(x < 0, 'failed!'); // fails
 *    AssertionError: failed! at &#60;stdin&#62;:12
 *
 * >> console.assert(false, 'failed!'); // fails
 *    AssertionError: failed! at &#60;stdin&#62;:13
 *
 * >> // passes; any Object expression is true
 * >> console.assert(new Boolean(false), 'failed!');
 */
exports.assert = assertHelper;

/**
 * Creates a new timer under the given name. Call `console.timeEnd(name)` with
 * the same name to stop the timer and log the time elapsed.
 * @param {String} name the timer name
 * @example >> console.time('timer-1');
 * >> // Wait some time ...
 * >> console.timeEnd('timer-1');
 * timer-1: 15769ms
 */
exports.time = function(name) {
    if (name && !timers[name]) {
        timers[name] = java.lang.System.nanoTime();
    }
};

/**
 * Stops a timer created by a call to `console.time(name)` and logs the time elapsed.
 * @param {String} name the timer name
 * @example >> console.time('timer-1');
 * >> // Wait some time ...
 * >> console.timeEnd('timer-1');
 * timer-1: 15769ms
 */
exports.timeEnd = function(name) {
    var start = timers[name];
    if (start) {
        var time = Math.round((java.lang.System.nanoTime() - start) / 1000000);
        writer.writeln(name + ": " + time + "ms");
        delete timers[name];
        return time;
    }
    return undefined;
};

/**
 * Prints a list of all properties of an object on <code>stdout</code>.
 * @param {Object} obj the object whose properties should be output
 * @example >> var obj = { foo: "bar", baz: 12345 };
 * >> console.dir(obj);
 * { foo: 'bar', baz: 12345 }
 * >> console.dir(global);
 * { setTimeout: [Function], setInterval: [Function] }
 */
exports.dir = function(obj) {
    require("ringo/shell").printResult(obj, writer);
};
