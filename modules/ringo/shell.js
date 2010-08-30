/**
 * @fileOverview provides functions to work with the Ringo shell.
 */

export('write', 'writeln', 'read', 'readln', 'start', 'quit');

var output = java.lang.System.out;
var input;
try {
    input = new Packages.jline.ConsoleReader();
} catch (x) {
    output.println("No input: " + x);
}

/**
 * Write 0..n arguments to standard output.
 */
function write() {
    var length = arguments.length;
    for (var i = 0; i < length; i++) {
        output.print(String(arguments[i]));
        if (i < length - 1)
            output.print(' ');
    }
}

/**
 * Write 0..n arguments to standard output, followed by a newline.
 */
function writeln() {
    write.apply(this, arguments);
    output.println();
}

/**
 * Read a single character from the standard input.
 */
function read() {
    return String.fromCharCode(input.readVirtualKey());
}

/**
 * Read a single line from the standard input.
 * @param prompt {String} optional prompt to display
 * @param echoChar {String} character to use as echo,
 *         e.g. '*' for passwords or '' for no echo.
 */
function readln(prompt, echoChar) {
    prompt = prompt || '';
    if (typeof echoChar == 'string') {
        var echo = echoChar == '' ?
               new java.lang.Character(0) :
               new java.lang.Character(echoChar.charCodeAt(0));
        return input.readLine(prompt, echo);
    }
    return input.readLine(prompt);
}

/**
 * Start the shell programmatically. This uses the current thread and thus will not
 * return. You should therefore call this function as the last statement in your script.
 * Terminating the shell will exit the program.
 * @since 0.5
 */
function start() {
    var engine = require('ringo/engine').getRhinoEngine();
    new org.ringojs.tools.RingoShell(engine).run();
}

/**
 * Quit the shell and exit the JVM.
 */
function quit() {
   java.lang.System.exit(0);
}
