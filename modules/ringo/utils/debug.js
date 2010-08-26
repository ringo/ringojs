
export("getScriptStack", "getJavaStack", "timer");

/**
 * Get a rendered JavaScript stack trace from a caught error.
 * @param {Error} error an error object
 * @param {String} prefix to prepend to result if available
 * @return {String} the rendered JavaScript stack trace
 */
function getScriptStack(error, prefix) {
    prefix = prefix || "";
    if (error && error.stack)
        return prefix + error.stack;
    return "";
}

/**
 * Get a rendered JavaScript stack trace from a caught error.
 * @param {Error} error an error object
 * @param {String} prefix to prepend to result if available
 * @return {String} the rendered JavaScript stack trace
 */
function getJavaStack(error, prefix) {
    prefix = prefix || "";
    var exception = error && error.rhinoException ?
        error.rhinoException : error;
    if (exception instanceof java.lang.Throwable) {
        var writer = new java.io.StringWriter();
        var printer = new java.io.PrintWriter(writer);
        exception.printStackTrace(printer);
        return prefix + writer.toString();
    }
    return "";
}

/**
 * A simple timer function. Invokes a function and prints the number
 * of milliseconds until the function returns.
 * @param {Function} fn the function to be invoked
 */
function timer(fn) {
    var start = java.lang.System.nanoTime();
    fn();
    var stop = java.lang.System.nanoTime();
    print(Math.round((stop - start) / 1000000), 'millis');
}
