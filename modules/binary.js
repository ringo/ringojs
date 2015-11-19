/**
 * @fileoverview
 * When dealing with network sockets or binary files, it’s necessary to read and
 * write into byte streams. JavaScript itself does not provide a native representation
 * of binary data, so this module provides two classes addressing this shortcoming.
 * The implementation follows the <a
 * href="http://wiki.commonjs.org/wiki/Binary/B">CommonJS Binary/B</a>
 * proposal.
 *
 * <code>ByteArray</code> implements a modifiable and
 * resizable byte buffer.
 *
 * <code>ByteString</code> implements an immutable byte
 * sequence.
 *
 * Both classes share a common base class <code>Binary</code>. The base class
 * can't be instantiated. It exists only to affirm that <code>ByteString</code>
 * and <code>ByteArray</code> instances of <code>Binary</code>.
 *
 * When passed to a Java method that expects a <code>byte[]</code>, instances of
 * these classes are automatically unwrapped.
 *
 * @example
 * // raw network streams only accept Binary as input
 * var stream = socket.getStream();
 * stream.write(new ByteArray([0xFA, 0xF0, 0x10, 0x58, 0xFF]));
 *
 * // network protocols like HTTP/1.1 require ASCII
 * const CRLF = new ByteString("\r\n", "ASCII");
 * const EMPTY_LINE = new ByteString("\r\n\r\n", "ASCII");
 *
 * // saves a java.security.Key to a file;
 * // the method getEncoded() returns a Java byte[]
 * fs.write("id_dsa.pub", ByteArray.wrap(publicKey.getEncoded()));
 *
 * // Generates a salt for hashing
 * var random = java.security.SecureRandom.getInstance("SHA1PRNG");
 * var salt = new ByteArray(8);
 * random.nextBytes(salt); // fills up salt with random bytes
 *
 * @see http://wiki.commonjs.org/wiki/Binary/B
 */

defineClass(org.ringojs.wrappers.Binary);

/**
 * Abstract base class for ByteArray and ByteString. The Binary type exists only
 * to affirm that ByteString and ByteArray instances of Binary.
 * @constructor
 */
exports.Binary = Binary;

/**
 * Constructs a writable and growable byte array.
 *
 *  If the first argument to this constructor is a number, it specifies
 * the initial length of the ByteArray in bytes.
 *
 * Else, the argument defines the content of the ByteArray. If the argument
 * is a String, the constructor requires a second argument containing the
 * name of the String's encoding. If called without arguments, an empty ByteArray
 * is returned.
 *
 * @param {Binary|Array|String|Number} contentOrLength content or length of the ByteArray.
 * @param {String} [charset] the encoding name if the first argument is a String.
 * @constructor
 */
exports.ByteArray = ByteArray;

/**
 * Constructs an immutable byte string.
 *
 * If the first argument is a String, the constructor requires a second
 * argument containing the name of the String's encoding. If called
 * without arguments, an empty ByteString is returned.
 *
 * @param {Binary|Array|String} content the content of the ByteString.
 * @param {String} charset the encoding name if the first argument is a String.
 * @constructor
 */
exports.ByteString = ByteString;

/**
 * Converts the String to a mutable ByteArray using the specified encoding.
 * @param {String} charset the name of the string encoding. Defaults to 'UTF-8'
 * @returns {ByteArray} a ByteArray representing the string
 * @example var ba = "hello world".toByteArray();
 */
Object.defineProperty(String.prototype, 'toByteArray', {
    value: function(charset) {
        charset = charset || 'utf8';
        return new ByteArray(String(this), charset);
    }, writable: true
});

/**
 * Converts the String to an immutable ByteString using the specified encoding.
 * @param {String} charset the name of the string encoding. Defaults to 'UTF-8'
 * @returns {ByteString} a ByteString representing the string
 * @example var bs = "hello world".toByteString();
 */
Object.defineProperty(String.prototype, 'toByteString', {
    value: function(charset) {
        charset = charset || 'utf8';
        return new ByteString(String(this), charset);
    }, writable: true
});

/**
 * Reverses the content of the ByteArray in-place.
 * @returns {ByteArray} this ByteArray with its elements reversed
 * @example var ba = new ByteArray([0,1,2,3,4,5,6,7,8]);
 * ba.reverse();
 * print(ba[0] == 8); // --> true
 */
Object.defineProperty(ByteArray.prototype, 'reverse', {
    value: function() {
        return Array.prototype.reverse.call(this);
    }, writable: true
});

/**
 * Sorts the content of the ByteArray in-place.
 * @param {Function} comparator the function to compare entries
 * @returns {ByteArray} this ByteArray with its elements sorted
 * @example var ba = "hello world".toByteArray();
 * ba.sort();
 * ba.decodeToString() // --> "dehllloorw"
 */
Object.defineProperty(ByteArray.prototype, 'sort', {
    value: function(fn) {
        fn = fn || function(a, b) a - b;
        return Array.prototype.sort.call(this, fn);
    }, writable: true
});

/**
 * Apply a function for each element in the ByteArray.
 * @param {Function} fn the function to call for each element
 * @param {Object} thisObj optional this-object for callback
 * @example var ba = "hello world".toByteArray();
 * // prints 104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100
 * ba.forEach(function(byte) { console.log(byte) });
 */
Object.defineProperty(ByteArray.prototype, 'forEach', {
    value: function(fn, thisObj) {
        Array.prototype.forEach.call(this, fn, thisObj);
    }, writable: true
});

/**
 * Return a ByteArray containing the elements of this ByteArray for which
 * the callback function returns true.
 * @param {Function} callback the filter function
 * @param {Object} thisObj optional this-object for callback
 * @returns {ByteArray} a new ByteArray
 * @example var ba = "hello world".toByteArray();
 * var bf = ba.filter(function(byte) { return byte > 110 });
 * bf.decodeToString(); // returns "owor"
 */
Object.defineProperty(ByteArray.prototype, 'filter', {
    value: function(fn, thisObj) {
        return new ByteArray(Array.prototype.filter.call(this, fn, thisObj));
    }, writable: true
});

/**
 * Tests whether some element in the array passes the test implemented by the
 * provided function.
 * @param {Function} callback the callback function
 * @param {Object} thisObj optional this-object for callback
 * @returns {Boolean} true if at least one invocation of callback returns true
 * @example var ba = new ByteArray([0,1,2,3,4,5,6,7,8]);
 * ba.some(function(byte) { return byte > 10; }); // --> false
 * ba.some(function(byte) { return byte < 10; }); // --> true
 */
Object.defineProperty(ByteArray.prototype, 'some', {
    value: function(fn, thisObj) {
        return Array.prototype.some.call(this, fn, thisObj);
    }, writable: true
});

/**
 * Tests whether all elements in the array pass the test implemented by the
 * provided function.
 * @param {Function} callback the callback function
 * @param {Object} thisObj optional this-object for callback
 * @returns {Boolean} true if every invocation of callback returns true
 * @example var ba = new ByteArray([0,1,2,3,4,5,6,7,8]);
 * ba.every(function(byte) { return byte > 5; }); // --> false
 * ba.every(function(byte) { return byte < 10; }); // --> true
 */
Object.defineProperty(ByteArray.prototype, 'every', {
    value: function(fn, thisObj) {
        return Array.prototype.every.call(this, fn, thisObj);
    }, writable: true
});

/**
 * Returns a new ByteArray whose content is the result of calling the provided
 * function with every element of the original ByteArray.
 * @param {Function} callback the callback
 * @param {Object} thisObj optional this-object for callback
 * @returns {ByteArray} a new ByteArray
 * @example var ba1 = new ByteArray([0,1,2,3,4,5,6,7,8]);
 * var ba2 = ba1.map(function(byte) { return 2 * byte; });
 * console.log(ba2.toArray()); // prints [0, 2, 4, 6, 8, 10, 12, 14, 16]
 */
Object.defineProperty(ByteArray.prototype, 'map', {
    value: function(fn, thisObj) {
        return new ByteArray(Array.prototype.map.call(this, fn, thisObj));
    }, writable: true
});

/**
 * Apply a function to each element in this ByteArray from left-to-right as to reduce its content to a single value.
 * @param {Function} callback the function to call with each element of the ByteArray
 * @param {Object} initialValue optional argument to be used as the first argument to the first call to the callback
 * @returns the return value of the last callback invocation
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce">Array.prototype.reduce()</a>
 * @example var ba = new ByteArray([0,1,2,3,4,5,6,7,8]);
 * ba.reduce(function(prev, curr) { return prev + curr; }); // --> 36
 */
Object.defineProperty(ByteArray.prototype, 'reduce', {
    value: function(fn, initialValue) {
        return initialValue === undefined ?
               Array.prototype.reduce.call(this, fn) :
               Array.prototype.reduce.call(this, fn, initialValue);
    }, writable: true
});

/**
 * Apply a function to each element in this ByteArray starting at the last
 * element as to reduce its content to a single value.
 * @param {Function} callback the function to call with each element of the ByteArray
 * @param {Object} initialValue optional argument to be used as the first argument to the first call to the callback
 * @returns the return value of the last callback invocation
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/ReduceRight">Array.prototype.reduceRight()</a>
 */
Object.defineProperty(ByteArray.prototype, 'reduceRight', {
    value: function(fn, initialValue) {
        return initialValue === undefined ?
               Array.prototype.reduceRight.call(this, fn) :
               Array.prototype.reduceRight.call(this, fn, initialValue);
    }, writable: true
});

/**
 * Removes the last element from an array and returns that element.
 * @returns {Number}
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * ba.pop() === 8; // --> true
 */
Object.defineProperty(ByteArray.prototype, 'pop', {
    value: function() {
        return Array.prototype.pop.call(this);
    }, writable: true
});

/**
 * Appends the given elements and returns the new length of the array.
 * @param {Number...} num... one or more numbers to append
 * @returns {Number} the new length of the ByteArray
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * ba.push(16);
 * console.log(ba.toArray()); // [0, 1, 2, 4, 8, 16]
 */
Object.defineProperty(ByteArray.prototype, 'push', {
    value: function() {
        return Array.prototype.push.apply(this, arguments);
    }, writable: true
});

/**
 * Removes the first element from the ByteArray and returns that element.
 * This method changes the length of the ByteArray
 * @returns {Number} the removed first element
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * ba.shift();
 * console.log(ba.toArray()); // [1, 2, 4, 8]
 */
Object.defineProperty(ByteArray.prototype, 'shift', {
    value: function() {
        return Array.prototype.shift.call(this);
    }, writable: true
});

/**
 * Adds one or more elements to the beginning of the ByteArray and returns its
 * new length.
 * @param {Number...} num... one or more numbers to append
 * @returns {Number} the new length of the ByteArray
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * ba.unshift(-8, -4, -2, -1);
 * console.log(ba.toArray()); // [248, 252, 254, 255, 0, 1, 2, 4, 8]
 */
Object.defineProperty(ByteArray.prototype, 'unshift', {
    value: function() {
        return Array.prototype.unshift.apply(this, arguments);
    }, writable: true
});

/**
 * Changes the content of the ByteArray, adding new elements while removing old
 * elements.
 * @param {Number} index the index at which to start changing the ByteArray
 * @param {Number} howMany The number of elements to remove at the given
 *        position
 * @param {Number...} elements... the new elements to add at the given position
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * ba.splice(2,2);
 * console.log(ba.toArray()); // [0, 1, 8]
 */
Object.defineProperty(ByteArray.prototype, 'splice', {
    value: function() {
        return new ByteArray(Array.prototype.splice.apply(this, arguments));
    }, writable: true
});

/**
 * Returns the byte at the given offset as ByteArray.
 * @name ByteArray.prototype.byteAt
 * @param {Number} offset
 * @returns {ByteArray}
 * @function
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * ba.byteAt(0); // --> [ByteArray 1]
 */

/**
 * Returns the byte at the given offset as ByteArray.
 * @name ByteArray.prototype.charAt
 * @param {Number} offset
 * @returns {ByteArray}
 * @function
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * ba.charAt(0); // --> [ByteArray 1]
 */

/**
 * Returns charcode at the given offset.
 * @name ByteArray.prototype.charCodeAt
 * @param {Number} offset
 * @returns {Number}
 * @function
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * ba.charCodeAt(0); // --> 0
 */

/**
 * Copy a range of bytes between start and stop from this object to another
 * ByteArray at the given target offset.
 * @param {Number} start
 * @param {Number} end
 * @param {ByteArray} target
 * @param {Number} targetOffset
 * @name ByteArray.prototype.copy
 * @function
 */

/**
 * The length in bytes. This property is writable. Setting it to a value higher
 * than the current value fills the new slots with 0, setting it to a lower
 * value truncates the byte array.
 * @type Number
 * @name ByteArray.prototype.length
 */

/**
 * Returns a new ByteArray containing a portion of this ByteArray.
 * @param {Number} begin Zero-based index at which to begin extraction.
 *        As a negative index, begin indicates an offset from the end of the
 *        sequence.
 * @param {Number} end  Zero-based index at which to end extraction.
 *        slice extracts up to but not including end.
 *        As a negative index, end indicates an offset from the end of the
 *        sequence.
 *        If end is omitted, slice extracts to the end of the sequence.
 * @returns {ByteArray} a new ByteArray
 * @name ByteArray.prototype.slice
 * @function
 */

/**
 * Returns a ByteArray composed of itself concatenated with the given
 * ByteString, ByteArray, and Array values.
 * @param {Binary...|Array...} args... one or more elements to concatenate
 * @returns {ByteArray} a new ByteArray
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
 * Returns an array containing the bytes as numbers.
 * @name ByteArray.prototype.toArray
 * @function
 */

/**
 * Returns a String representation of the ByteArray.
 * @name ByteArray.prototype.toString
 * @function
 * @example var ba = new ByteArray([0,1,2,4,8]);
 * console.log(ba.toString()); // prints '[ByteArray 5]'
 */

/**
 * Returns the ByteArray decoded to a String using the given encoding
 * @param {String} encoding the name of the encoding to use
 * @name ByteArray.prototype.decodeToString
 * @function
 * @example var ba = new ByteArray([240, 159, 152, 130]);
 * console.log(ba.decodeToString("UTF-8")); // prints &#128514;
 */

/**
 * Returns the index of the first occurrence of sequence (a Number or a
 * ByteString or ByteArray of any length) or -1 if none was found. If start
 * and/or stop are specified, only elements between the indexes start and stop
 * are searched.
 * @param {Number|Binary} sequence the number or binary to look for
 * @param {Number} start optional index position at which to start searching
 * @param {Number} stop optional index position at which to stop searching
 * @returns {Number} the index of the first occurrence of sequence, or -1
 * @name ByteArray.prototype.indexOf
 * @function
 */

/**
 * Returns the index of the last occurrence of sequence (a Number or a
 * ByteString or ByteArray of any length) or -1 if none was found. If start
 * and/or stop are specified, only elements between the indexes start and stop
 * are searched.
 * @param {Number|Binary} sequence the number or binary to look for
 * @param {Number} start optional index position at which to start searching
 * @param {Number} stop optional index position at which to stop searching
 * @returns {Number} the index of the last occurrence of sequence, or -1
 * @name ByteArray.prototype.lastIndexOf
 * @function
 */

/**
 * Split at delimiter, which can by a Number, a ByteString, a ByteArray or an
 * Array of the prior (containing multiple delimiters, i.e., "split at any of
 * these delimiters"). Delimiters can have arbitrary size.
 * @param {Number|Binary} delimiter one or more delimiter items
 * @param {Object} options optional object parameter with the following
 *        optional properties: <ul>
 *        <li>count - Maximum number of elements (ignoring delimiters) to
 *        return. The last returned element may contain delimiters.</li>
 *        <li>includeDelimiter - Whether the delimiter should be included in
 *        the result.</li></ul>
 * @name ByteArray.prototype.split
 * @function
 */

/**
 * Create a ByteArray wrapper for a Java byte array without creating a new copy
 * as the ByteArray constructor does. Any changes made on the ByteArray
 * instance will be applied to the original byte array.
 * @name ByteArray.wrap
 * @param {Binary} bytes a Java byte array or Binary instance
 * @returns {ByteArray} a ByteArray wrapping the argument
 * @function
 * @since 0.5
 * @example  // writes a java.security.Key byte[] to a file;
 * fs.write("id_dsa.pub", ByteArray.wrap(publicKey.getEncoded()));
 */

 /**
 * Unwraps the underlying Java <code>byte[]</code> from ByteArray. It can be
 * passed to a Java method that expects a byte array.
 * @name ByteArray.prototype.unwrap
 * @returns {byte[]} a native Java byte array
 * @function
 * @since 0.5
 */

/**
 * Sets the byte at the given offset. <code>set(offset, value)</code> is
 * analogous to indexing with brackets <code>&#91;offset&#93;=value</code>.
 * @name ByteArray.prototype.set
 * @param {Number} offset
 * @param {Number} value
 * @function
 * @example var ba = new ByteArray([0,255]);
 * ba[0] = 64;
 * print(ba[0]); // prints 64
 */

/**
 * Returns the byte at the given offset as integer. <code>get(offset)</code> is
 * analogous to indexing with brackets <code>&#91;offset&#93;</code>.
 * @name ByteArray.prototype.get
 * @param {Number} offset
 * @returns {Number}
 * @function
 * @example var ba = new ByteArray([0,255]);
 * print(ba[0]); // prints 0
 */

/**
 * Create a ByteString wrapper for a Java byte array without creating a new copy
 * as the ByteString constructor does.
 * @name ByteString.wrap
 * @param {Binary} bytes a Java byte array or Binary instance
 * @returns {ByteString} a ByteString wrapping the argument
 * @function
 * @since 0.5
 */

/**
 * Unwraps the underlying Java <code>byte[]</code> from ByteString. It can be
 * passed to a Java method that expects a byte array.
 * @name ByteString.prototype.unwrap
 * @returns {byte[]} a native Java byte array
 * @function
 * @since 0.5
 */

/**
 * Returns a byte for byte copy of this immutable ByteString as a mutable
 * ByteArray.
 * @name ByteString.prototype.toByteArray
 * @function
 * @returns {ByteArray}
 */

/**
 * Returns this ByteString itself.
 * @name ByteString.prototype.toByteString
 * @function
 */

/**
 * Returns an array containing the bytes as numbers.
 * @name ByteString.prototype.toArray
 * @function
 */

/**
 * Returns a debug representation such as `"[ByteSTring 10]"` where 10 is the
 * length of this ByteString.
 * @name ByteString.prototype.toString
 * @function
 */

/**
 * Returns this ByteString as string, decoded using the given charset.
 * @name ByteString.prototype.decodeToString
 * @param {String} charset the name of the string encoding
 * @function
 */

/**
 * Returns the index of the first occurrence of sequence (a Number or a
 * ByteString or ByteArray of any length), or -1 if none was found. If start
 * and/or stop are specified, only elements between the indexes start and stop
 * are searched.
 * @param {Number|Binary} sequence the number or binary to look for
 * @param {Number} start optional index position at which to start searching
 * @param {Number} stop optional index position at which to stop searching
 * @returns {Number} the index of the first occurrence of sequence, or -1
 * @name ByteString.prototype.indexOf
 * @function
 */

/**
 * Returns the index of the last occurrence of sequence (a Number or a
 * ByteString or ByteArray of any length) or -1 if none was found. If start
 * and/or stop are specified, only elements between the indexes start and stop
 * are searched.
 * @param {Number|Binary} sequence the number or binary to look for
 * @param {Number} start optional index position at which to start searching
 * @param {Number} stop optional index position at which to stop searching
 * @returns {Number} the index of the last occurrence of sequence, or -1
 * @name ByteString.prototype.lastIndexOf
 * @function
 */

/**
 * Returns the byte at the given offset as ByteString.
 * @name ByteString.prototype.byteAt
 * @param {Number} offset
 * @returns {ByteString}
 * @function
 */

/**
 * Returns the byte at the given offset as ByteString.
 * @name ByteString.prototype.charAt
 * @param {Number} offset
 * @returns {ByteString}
 * @function
 */

 /**
 * Returns charcode at the given offset.
 * @name ByteString.prototype.charCodeAt
 * @param {Number} offset
 * @returns {Number}
 * @function
 */

/**
 * Returns the byte at the given offset as a ByteString. `get(offset)` is
 * analogous to indexing with brackets &#91;offset&#93;.
 * @name ByteString.prototype.get
 * @param {Number} offset
 * @returns {ByteString}
 * @function
 */

/**
 * Copy a range of bytes between start and stop from this ByteString to a
 * target ByteArray at the given targetStart offset.
 * @param {Number} start
 * @param {Number} end
 * @param {ByteArray} target
 * @param {Number} targetStart
 * @name ByteString.prototype.copy
 * @function
 */

/**
 * Split at delimiter, which can by a Number, a ByteString, a ByteArray or an
 * Array of the prior (containing multiple delimiters, i.e., "split at any of
 * these delimiters"). Delimiters can have arbitrary size.
 * @param {Number|Binary} delimiter one or more delimiter items
 * @param {Object} options optional object parameter with the following
 *        optional properties: <ul>
 *        <li>count - Maximum number of elements (ignoring delimiters) to
 *        return. The last returned element may contain delimiters.</li>
 *        <li>includeDelimiter - Whether the delimiter should be included in
 *        the result.</li></ul>
 * @name ByteString.prototype.split
 * @function
 */

/**
 * Returns a new ByteString containing a portion of this ByteString.
 * @param {Number} begin Zero-based index at which to begin extraction.
 *        As a negative index, begin indicates an offset from the end of the
 *        sequence.
 * @param {Number} end Zero-based index at which to end extraction. slice
 *        extracts up to but not including end. As a negative index, end
 *        indicates an offset from the end of the sequence. If end is omitted,
 *        slice extracts to the end of the sequence.
 * @returns {ByteString} a new ByteString
 * @name ByteString.prototype.slice
 * @function
 */

/**
 * Returns a ByteString composed of itself concatenated with the given
 * ByteString, ByteArray, and Array values.
 * @param {Binary...|Array...} args... one or more elements to concatenate
 * @returns {ByteString} a new ByteString
 * @name ByteString.prototype.concat
 * @function
 */

/**
 * The length in bytes. This property is read-only. Setting it to a value
 * silently fails.
 * @type Number
 * @name ByteString.prototype.length
 */