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

include('ringo/shell');

var env = require('system').env;
var enabled = env && "TERM" in env;

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
        if (arg.charCodeAt(0) == 27) {
            if (enabled) write(arg);
        } else {
            write(arg);
            if (i < arguments.length - 1) {
                write(" ");
            }
        }
    }
};

exports.writeln = function() {
    exports.write.apply(this, arguments);
    writeln(enabled ? exports.RESET : "");
};

// re-export ringo/shell's read() and readln()
/**
 * @function
 */
exports.read = read;
/**
 * @function
 */
exports.readln = readln;
