
export('bindArguments', 'bindThisObject');

module.shared = true;

/**
 * Return a function wrapper around another function that binds
 * some or all arguments of the original function. The argument
 * list of the returned function corresponds to the arguments
 * of the original function that are not covered by the pre-defined
 * arguments.
 *
 * This is a simple reimplementation of Mochikit partial()
 *
 * @param fn {function} a function
 * @param args
 * @returns {function} a function with bound arguments
 */
function bindArguments(fn /*, arg, ... */) {
    if (typeof(fn) != "function")
        throw new Error("Not a function: " + fn);
    var slice = Array.prototype.slice;
    var pre_args = slice.call(arguments, 1);
    return function() {
        var args = pre_args.concat(slice.call(arguments));
        return fn.apply(this, args);
    }
}

/**
 * Create a wrapper for a function that always binds an object to
 * the this-object even if it is called as global function or on
 * another this-object.
 *
 * @param fn {function} a function
 * @param obj {Object} the object to bind to the "this" object
 * @returns a function with bound this object
 */
function bindThisObject(fn, obj) {
    if (typeof(fn) != "function")
        throw new Error("Not a function: " + fn);
    return function() {
        return fn.apply(obj, arguments);
    }
}
