
export('readOnlyPropertyDesc',
        'writeOnlyPropertyDesc',
        'readWritePropertyDesc',
        'jsonDateReviver',
        'timer');

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
    desc.get = function() { return obj[name]; }
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
    desc.set = function(value) { obj[name] = value; }
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
    desc.get = function() { return obj[name]; }
    desc.set = function(value) { obj[name] = value; }
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

function timer(fn) {
    var start = java.lang.System.nanoTime();
    fn();
    var stop = java.lang.System.nanoTime();
    print(Math.round((stop - start) / 1000000), 'millis');
}