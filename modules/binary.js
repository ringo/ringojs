/**
 * @fileoverview <p>This module provides implementations of the Binary/ByteArray/ByteString
 * classes defined in the <a href="http://wiki.commonjs.org/wiki/Binary/B">Binary/B proposal</a>.
 *
 * <p>The JavaScript Binary class serves as common base class for ByteArray and ByteString
 * and can't be instantiated. ByteArray implements a modifiable and resizable byte buffer,
 * while ByteString implements an immutable byte sequence. The ByteArray and ByteString
 * constructors can take several arguments. Have a look at the proposal for details.</p>
 *
 * <p>When passed to a Java method that expects a byte array, instances of thes class
 * are automatically unwrapped. Use the {@link #unwrap()} method to explicitly get the
 * wrapped Java byte array.</p>
 */

defineClass(org.ringojs.wrappers.Binary);

/**
 * Abstract base class for ByteArray and ByteString
 * @constructor
 */
exports.Binary = Binary;

/**
 * A writable byte array.
 * @constructor
 */
exports.ByteArray = ByteArray;

/**
 * An immutable byte string.
 * @constructor
 */
exports.ByteString = ByteString;

module.shared = true;

Object.defineProperty(String.prototype, 'toByteArray', {
    value: function(charset) {
        charset = charset || 'utf8';
        return new ByteArray(String(this), charset);
    }
});

Object.defineProperty(String.prototype, 'toByteString', {
    value: function(charset) {
        charset = charset || 'utf8';
        return new ByteString(String(this), charset);
    }
});

Object.defineProperty(ByteArray.prototype, 'reverse', {
    value: function() {
        return Array.reverse(this);
    }
});

Object.defineProperty(ByteArray.prototype, 'sort', {
    value: function(fn) {
        fn = fn || function(a, b) a - b;
        return Array.sort(this, fn);
    }
});

Object.defineProperty(ByteArray.prototype, 'forEach', {
    value: function(fn, thisObj) {
        Array.forEach(this, fn, thisObj);
    }
});

Object.defineProperty(ByteArray.prototype, 'filter', {
    value: function(fn, thisObj) {
        return Array.filter(this, fn, thisObj);
    }
});

Object.defineProperty(ByteArray.prototype, 'some', {
    value: function(fn, thisObj) {
        return Array.some(this, fn, thisObj);
    }
});

Object.defineProperty(ByteArray.prototype, 'every', {
    value: function(fn, thisObj) {
        return Array.every(this, fn, thisObj);
    }
});

Object.defineProperty(ByteArray.prototype, 'map', {
    value: function(fn, thisObj) {
        return Array.map(this, fn, thisObj);
    }
});

Object.defineProperty(ByteArray.prototype, 'reduce', {
    value: function(fn, initialValue) {
        return initialValue === undefined ?
               Array.reduce(this, fn) :
               Array.reduce(this, fn, initialValue);
    }
});

Object.defineProperty(ByteArray.prototype, 'reduceRight', {
    value: function(fn, initialValue) {
        return initialValue === undefined ?
               Array.reduceRight(this, fn) :
               Array.reduceRight(this, fn, initialValue);
    }
});

Object.defineProperty(ByteArray.prototype, 'pop', {
    value: function() {
        return Array.pop(this);
    }
});

Object.defineProperty(ByteArray.prototype, 'push', {
    value: function() {
        return Array.prototype.push.apply(this, arguments);
    }
});

Object.defineProperty(ByteArray.prototype, 'shift', {
    value: function() {
        return Array.shift(this);
    }
});

Object.defineProperty(ByteArray.prototype, 'unshift', {
    value: function() {
        return Array.prototype.unshift.apply(this, arguments);
    }
});

/**
 * Copy a range of bytes from this object to another byte array.
 * @name ByteArray.prototype.copy
 * @function
 */

/**
 * @name ByteArray.prototype.length
 */

/**
 * @name ByteArray.prototype.slice
 * @function
 */

/**
 * @name ByteArray.prototype.concat
 * @function
 */

/**
 * @name ByteArray.prototype.toByteArray
 * @function
 */

/**
 * @name ByteArray.prototype.toByteString
 * @function
 */

/**
 * @name ByteArray.prototype.toArray
 * @function
 */

/**
 * @name ByteArray.prototype.toString
 * @function
 */

/**
 * @name ByteArray.prototype.decodeToString
 * @function
 */

/**
 * @param {number|Binary} sequence the number or binary to look for
 * @param {number} [startAt] optional index position 
 * @returns {number} the index of the first occurrence of sequence, or -1
 * @name ByteArray.prototype.indexOf
 * @function
 */

/**
 * @name ByteArray.prototype.lastIndexOf
 * @function
 */

/**
 * @name ByteArray.prototype.split
 * @function
 */
