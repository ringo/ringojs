/**
 * @fileOverview provides functions to work with the Ringo shell.
 */

var system = require('system');

export('write', 'writeln', 'read', 'readln', 'start', 'quit');

try {
    var input = new Packages.jline.ConsoleReader();
} catch (x) {
    // fall back to plain standard input
}

/**
 * Write 0..n arguments to standard output.
 */
function write() {
    var length = arguments.length;
    var out = system.stdout;
    for (var i = 0; i < length; i++) {
        out.write(String(arguments[i]));
        if (i < length - 1)
            out.write(' ');
    }
}

/**
 * Write 0..n arguments to standard output, followed by a newline.
 */
function writeln() {
    write.apply(this, arguments);
    system.stdout.writeLine('');
}

/**
 * Read a single character from the standard input.
 */
function read() {
    if (!input) {
        throw new Error('jline not installed');
    }
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
    if (input) {
        if (typeof echoChar == 'string') {
            var echo = echoChar == '' ?
                   new java.lang.Character(0) :
                   new java.lang.Character(echoChar.charCodeAt(0));
            return input.readLine(prompt, echo);
        }
        return input.readLine(prompt);
    } else {
        system.stdout.write(prompt);
        return system.stdin.readLine().trim();
    }
}

/**
 * Start the shell programmatically. This uses the current thread and thus will not
 * return. You should therefore call this function as the last statement in your script.
 * Terminating the shell will exit the program.
 * @since 0.5
 */
function start(engine) {
    engine = engine || require('ringo/engine').getRhinoEngine();
    new org.ringojs.tools.RingoShell(engine).run();
}

/**
 * Quit the shell and exit the JVM.
 * @param status {Number} optional integer exit status code (default is 0)
 */
function quit(status) {
   java.lang.System.exit(status || 0);
}
