/**
 * @fileoverview A module for printing ANSI terminal escape sequences.
 * This module provides a number of useful color and style constants,
 * and a replacement for the print function optimized for styled output.
 *
 * @example
 * <code>include('ringo/term')
 * writeln(YELLOW, "foo", MAGENTA, "bar");
 * // foo bar
 * writeln(YELLOW, ONBLUE, "IKEA");
 * // IKEA
 * writeln(RED, BOLD, INVERSE, "Red Alert!");
 * // Red Alert!</code>
 *
 * @see http://en.wikipedia.org/wiki/ANSI_escape_code
 */

var system = require('system');
var {Stream, TextStream} = require('io');
var System = java.lang.System;

var env = system.env;
var supportedTerminals = {
    'ansi': 1,
    'vt100': 1,
    'xterm': 1,
    'xtermc': 1,
    'xterm-color': 1,
    'xterm-256color': 1,
    'gnome-terminal': 1
};

var javaConsole = System.console() || System.out;
var enabled = env.TERM && env.TERM in supportedTerminals;

exports.RESET =     "\u001B[0m";
exports.BOLD =      "\u001B[1m";
exports.UNDERLINE = "\u001B[4m";
exports.INVERSE =   "\u001B[7m";

exports.BLACK =     "\u001B[30m";
exports.RED =       "\u001B[31m";
exports.GREEN =     "\u001B[32m";
exports.YELLOW =    "\u001B[33m";
exports.BLUE =      "\u001B[34m";
exports.MAGENTA =   "\u001B[35m";
exports.CYAN =      "\u001B[36m";
exports.WHITE =     "\u001B[37m";

exports.ONBLACK =   "\u001B[40m";
exports.ONRED =     "\u001B[41m";
exports.ONGREEN =   "\u001B[42m";
exports.ONYELLOW =  "\u001B[43m";
exports.ONBLUE =    "\u001B[44m";
exports.ONMAGENTA = "\u001B[45m";
exports.ONCYAN =    "\u001B[46m";
exports.ONWHITE =   "\u001B[47m";

// used to remove ANSI control sequences if disabled
var cleaner = /\u001B\[\d*(?:;\d+)?[a-zA-Z]/g;
// used to check if a string consists only of ANSI control sequences
var matcher = /^(?:\u001B\[\d*(?:;\d+)?[a-zA-Z])+$/;

/**
 * Creates a terminal writer that writes to the Java console.
 * @param {Stream} out a TextStream
 */
var TermWriter = exports.TermWriter = function() {

    if (!(this instanceof TermWriter)) {
        return new TermWriter();
    }

    // edge case: a JVM can exist without a console
    if (javaConsole === null) {
        throw "No console associated with the current JVM.";
    }

    var _enabled = enabled;

    /**
     * Enable or disable ANSI terminal colors for this writer.
     * @param {Boolean} flag true to enable ANSI colors.
     */
    this.setEnabled = function(flag) {
        _enabled = flag;
    };

    /**
     * Returns true if ANSI terminal colors are enabled.
     * @returns {Boolean} true if ANSI is enabled.
     */
    this.isEnabled = function() {
        return _enabled;
    };

    /**
     * Write the arguments to the stream, applying ANSI terminal colors if
     * enabled is true.
     * @param {*...} args... variable number of arguments to write
     */
    this.write = function() {
        for (var i = 0; i < arguments.length; i++) {
            var arg = String(arguments[i]);
            if (!_enabled) {
                arg = arg.replace(cleaner, '');
            }
            javaConsole.printf("%s", arg);
            if (arg && !matcher.test(arg) && i < arguments.length - 1) {
                javaConsole.printf(" ");
            }
        }
    };

    /**
     * Write the arguments to the stream followed by a newline character,
     * applying ANSI terminal colors if enabled is true.
     * @param {*...} args... variable number of arguments to write
     */
    this.writeln = function() {
        this.write.apply(this, arguments);
        javaConsole.printf((_enabled ? exports.RESET : "") + "\n");
    };
};

var tw = new TermWriter();
/**
 * Write the arguments to `system.stdout`, applying ANSI terminal colors if
 * support has been detected.
 * @param {*...} args... variable number of arguments to write
 */
exports.write = tw.write;
/**
 * Write the arguments to `system.stdout` followed by a newline character,
 * applying ANSI terminal colors if support has been detected.
 * @param {*...} args... variable number of arguments to write
 */
exports.writeln = tw.writeln;


