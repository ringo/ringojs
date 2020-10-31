/**
 * @fileOverview A simple text Buffer class for composing strings.
 */

const binary = require('binary');
const strings = require('ringo/utils/strings');

/**
 * A Buffer class for composing strings. This is implemented
 * as a simple wrapper around a JavaScript array.
 * @param {*...} args... initial parts to write to the buffer
 */
module.exports.Buffer = function Buffer() {

    const content = [];
    let length = 0;

    /**
     * Reset the buffer discarding all its content.
     * @returns {Buffer} this buffer object
     */
    this.reset = function() {
        content.length = 0;
        length = 0;
        return this;
    };

    /**
     * Append all arguments to this buffer.
     * @param {*...} args... variable arguments to append to the buffer
     * @returns {Buffer} this buffer object
     */
    this.write = function() {
        for (let i = 0; i < arguments.length; i++) {
            let str = String(arguments[i]);
            content.push(str);
            length += str.length;
        }
        return this;
    };

    /**
     * Append all arguments to this buffer terminated by a carriage return/newline sequence.
     * @param {*...} args... variable arguments to append to the buffer
     * @returns {Buffer} this buffer object
     */
    this.writeln = function() {
        this.write.apply(this, arguments);
        content.push("\r\n");
        length += 2;
        return this;
    };

    /**
     * Return the content of this buffer as string.
     * @returns {String} the buffer as string
     */
    this.toString = function() {
        return content.join('');
    };

    /**
     * Call function <code>fn</code> with each content part in this buffer.
     * @param {Function} fn a function to apply to each buffer part
     */
    this.forEach = function(fn) {
        content.forEach(fn);
    };

    /**
     * A read-only property containing the number of characters currently
     * contained by this buffer.
     */
    Object.defineProperty(this, "length", {
        get: () => length
    });

    /**
     * Get a message digest on the content of this buffer.
     * @param {String} algorithm the algorithm to use, defaults to MD5
     * @returns {String} a Base16 encoded digest
     */
    this.digest = function(algorithm) {
        const md = java.security.MessageDigest.getInstance(algorithm || "MD5");
        content.forEach(part => {
            md.update(binary.toByteString(String(part)));
        });
        const b = binary.ByteString.wrap(md.digest());
        return strings.b16encode(b);
    };

    if (arguments.length > 0) {
        this.write.apply(this, arguments);
    }

    return this;
};
