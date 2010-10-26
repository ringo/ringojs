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
var {AnsiConsole} = org.fusesource.jansi;
var System = java.lang.System;

var env = system.env;
var supportedTerminals = {
    'ansi': 1,
    'vt100': 1,
    'xterm': 1,
    'xtermc': 1,
    'xterm-color': 1,
    'gnome-terminal': 1
};
var jansiInstalled = typeof AnsiConsole === "function";
var enabled = (env.TERM && env.TERM in supportedTerminals) || jansiInstalled;

if (jansiInstalled) {
    // Jansi wraps System.out and System.err so we need to
    // reset stdout and stderr in the system module
    AnsiConsole.systemInstall();
    system.stdout = new TextStream(new Stream(System.out));
    system.stderr = new TextStream(new Stream(System.err));
}

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

exports.write = function() {
    for (var i = 0; i < arguments.length; i++) {
        var arg = String(arguments[i]);
        var out = system.stdout;
        if (arg.charCodeAt(0) == 27) {
            if (enabled) out.write(arg);
        } else {
            out.write(arg);
            if (i < arguments.length - 1) {
                out.write(" ");
            }
        }
    }
};

exports.writeln = function() {
    exports.write.apply(this, arguments);
    system.stdout.writeLine(enabled ? exports.RESET : "");
};

