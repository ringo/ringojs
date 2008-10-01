// This module is evaluated on shell scopes,
// so to extend the helma shell just add stuff here.

var output = java.lang.System.out;
var input = new java.io.InputStreamReader(java.lang.System["in"]);

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
    return String.fromCharCode(input.read());
}

/**
 * Read a single line from the standard input. 
 * @param password {Boolean} if true character echo is replaced with '*'
 */
function readln(password) {
    var buffer = [];
    var c;
    while ((c = read()) != '\r' && c != '\n') {
        if (password) {
            write('*');
        } else {
            write(c);
        }
        buffer.push(c);
    }
    return buffer.join('');
}

/**
 * Quit the shell and exit the JVM.
 */
function quit() {
   java.lang.System.exit(0);
}
