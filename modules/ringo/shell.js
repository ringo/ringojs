// This module is evaluated on shell scopes,
// so to extend the ringo shell just add stuff here.

export('write', 'writeln', 'read', 'readln', 'quit');

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
 * Quit the shell and exit the JVM.
 */
function quit() {
   java.lang.System.exit(0);
}
