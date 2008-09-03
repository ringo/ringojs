// This module is evaluated on shell scopes,
// so to extend the helma shell just add stuff here.

var out = java.lang.System.out;

/**
 * Write 0..n arguments to standard output.
 */
function write() {
    var length = arguments.length;
    for (var i = 0; i < length; i++) {
        out.print(String(arguments[i]));
        if (i < length - 1)
            out.print(' ');
    }
}

/**
 * Write 0..n arguments to standard output, followed by a newline.
 */
function writeln() {
    write.apply(this, arguments);
    out.println();
}

/**
 * Quit the shell and exit the JVM.
 */
function quit() {
   java.lang.System.exit(0);
}
