
export('readOnlyPropertyDesc', 'writeOnlyPropertyDesc', 'readWritePropertyDesc');

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