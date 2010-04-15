
require('core/string');

export('readOnlyPropertyDesc',
        'writeOnlyPropertyDesc',
        'readWritePropertyDesc',
        'jsonDateReviver',
        'format',
        'getScriptStack',
        'getJavaStack',
        'timer');

module.shared = true;

/**
 * Create a read-only property descriptor to be used as third argument in
 * Object.defineProperty that maps a property to a property in
 * another object.
 *
 * The third argument is optional and can be used to define additional
 * settings on the descriptor such as enumerable, writable, or configurable.
 *
 * @param obj the target object
 * @param name the target property name
 * @param desc optional: the descriptor object, or undefined
 * @return a property descriptor object that maps to a property in a target object
 */
function readOnlyPropertyDesc(obj, name, desc) {
    desc = desc || {};
    desc.get = function() { return obj[name]; };
    return desc;
}

/**
 * Create a write-only property descriptor to be used as third argument in
 * Object.defineProperty that maps a property to a property in
 * another object.
 *
 * The third argument is optional and can be used to define additional
 * settings on the descriptor such as enumerable, writable, or configurable.
 *
 * @param obj the target object
 * @param name the target property name
 * @param desc optional: the descriptor object, or undefined
 * @return a property descriptor object that maps to a property in a target object
 */
function writeOnlyPropertyDesc(obj, name, desc) {
    desc = desc || {};
    desc.set = function(value) { obj[name] = value; };
    return desc;
}

/**
 * Create a read-write property descriptor to be used as third argument in
 * Object.defineProperty that maps a property to a property in
 * another object.
 *
 * The third argument is optional and can be used to define additional
 * settings on the descriptor such as enumerable, writable, or configurable.
 *
 * @param obj the target object
 * @param name the target property name
 * @param desc optional: the descriptor object, or undefined
 * @return a property descriptor object that maps to a property in a target object
 */
function readWritePropertyDesc(obj, name, desc) {
    desc = desc || {};
    desc.get = function() { return obj[name]; };
    desc.set = function(value) { obj[name] = value; };
    return desc;
}

/**
 * JSON reviver function for Date values. Pass this as second argument to
 * JSON.parse to convert stringified dates back into Date objects. Borrowed
 * from http://www.west-wind.com/weblog/posts/729630.aspx
 *
 * @param key the JSON key
 * @param value the JSON value
 */
function jsonDateReviver(key, value) {
    if (typeof value === 'string') {
        var a = jsonDateRegexp.exec(value);
        if (a) {
            return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
        }
    }
    return value;
}

var jsonDateRegexp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;

/**
 * General purpuse timer.
 */
function timer(fn) {
    var start = java.lang.System.nanoTime();
    fn();
    var stop = java.lang.System.nanoTime();
    print(Math.round((stop - start) / 1000000), 'millis');
}

/**
 * A simple string formatter. If the first argument is a format string
 * containing a number of curly bracket pairs {} as placeholders,
 * the same number of following arguments will be used to replace the curly
 * bracket pairs in the format string. If the first argument is not a string
 * or does not contain any curly brackets, the arguments are simply concatenated
 * to a string and returned.
 *
 * @param {String} format string, followed by a variable number of values
 * @return {String} the formatted string
 */
function format() {
    if (arguments.length == 0) {
        return "";
    }
    var format = arguments[0];
    var index = 1;
    // Replace placehoder with argument as long as possible
    if (typeof format === "string") {
        if (format.contains("{}") && arguments.length > 1) {
            var args = arguments;
            format = format.replace(/{}/g, function(m) {
                return index < args.length ? args[index++] : m;
            });
        }
    } else {
        format = String(format);
    }
    // append remaining arguments separated by " "
    if (index < arguments.length) {
        return [format].concat(Array.slice(arguments, index).map(String)).join(" ");
    } else {
        return format;        
    }
}

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
