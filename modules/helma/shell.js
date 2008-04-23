// This module is evaluated on shell scopes,
// so to extend the helma shell just add stuff here.

/**
 * Write 0..n arguments to standard out.
 */
function writeln() {
    var length = arguments.length;
    var out = java.lang.System.out;
    for (var i = 0; i < length; i++) {
        out.print(String(arguments[i]));
        if (i < length - 1)
            out.print(' ');
    } 
    out.println();
}

/**
 * Quit the shell and exit the JVM.
 */
function quit() {
   java.lang.System.exit(0);
}
