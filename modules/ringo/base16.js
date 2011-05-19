/**
 * @fileOverview Base16 encoding and decoding for binary data and strings.
 */

var {Binary, ByteString, ByteArray} = require('binary');

var chars = ['0', '1', '2', '3', '4', '5', '6', '7',
             '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Encode a string or binary to a Base16 encoded string
 * @param {String|Binary} str a string or binary
 * @param {String} encoding optional encoding to use if
 *     first argument is a string. Defaults to 'utf8'.
 * @returns the Base16 encoded string
 */
exports.encode = function(str, encoding) {
    encoding = encoding || 'utf8';
    var input = str instanceof Binary ? str : String(str).toByteString(encoding);
    var length = input.length;
    var result = [];

    for (var i = 0; i < length; i++) {
        var n = input[i];
        result.push(chars[n >>> 4], chars[n & 0xf]);
    }
    return result.join('');
}

/**
 * Decodes a Base16 encoded string to a string or byte array.
 * @param {String} str the Base16 encoded string
 * @param {String} encoding the encoding to use for the return value.
 *     Defaults to 'utf8'. Use 'raw' to get a ByteArray instead of a string.
 * @returns the decoded string or ByteArray
 */
exports.decode = function(str, encoding) {
    var input = str instanceof Binary ? str : String(str).toByteString('ascii');
    var length = input.length / 2;
    var output = new ByteArray(length);

    for (var i = 0; i < length; i++) {
        var n1 = decodeChar(input[i * 2]);
        var n2 = decodeChar(input[i * 2 + 1]);
        output[i] = (n1 << 4) + n2;
    }
    encoding = encoding || 'utf8';
    return encoding == 'raw' ? output : output.decodeToString(encoding);
}

function decodeChar(c) {
    if (c >= 48 && c <= 57) return c - 48;
    if (c >= 65 && c <= 70) return c - 55;
    if (c >= 97 && c <= 102) return c - 87;
    throw new Error('Invalid base16 character: ' + c);
}