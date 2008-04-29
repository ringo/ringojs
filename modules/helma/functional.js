/**
 * Simple reimplementation of Mochikit partial()
 */
function partial(fn /*, arg, ... */) {
    if (typeof(fn) != "function")
        throw "fn not a function in functionUtils.partial: " + fn;
    var slice = Array.prototype.slice;
    var pre_args = slice.call(arguments, 1);
    return function() {
        var args = pre_args.concat(slice.call(arguments));
        return fn.apply(this, args);
    }
}
