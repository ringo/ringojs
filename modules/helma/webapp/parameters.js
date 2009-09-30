
include('binary');

export('parseParameters');

var log = require('helma/logging').getLogger(module.id);

// character codes used for slicing and decoding
var SPACE     = String.charCodeAt(" ", 0);
var PERCENT   = String.charCodeAt("%", 0);
var AMPERSAND = String.charCodeAt("&", 0);
var PLUS      = String.charCodeAt("+", 0);
var EQUALS    = String.charCodeAt("=", 0);

// character codes used for hex decoding
var CHAR_0 = String.charCodeAt("0", 0);
var CHAR_9 = String.charCodeAt("9", 0);
var CHAR_A = String.charCodeAt("A", 0);
var CHAR_F = String.charCodeAt("F", 0);
var CHAR_a = String.charCodeAt("a", 0);
var CHAR_f = String.charCodeAt("f", 0);

/**
 * Parse a byte array representing a query string or post data into an
 * JavaScript object structure using the specified encoding.
 * @param bytes a Binary object
 * @param params a parameter object to parse into
 * @param encoding a valid encoding name, defaults to UTF-8
 */
function parseParameters(bytes, params, encoding) {
    if (!bytes) {
        return;
    } else if (typeof bytes == "string" || bytes instanceof ByteString) {
        // stream.read() should really return ByteArray in the first place...
        bytes = bytes.toByteArray();
    }
    encoding = encoding || "UTF-8";
    for each (param in bytes.split(AMPERSAND)) {
        var [name, value] = param.split(EQUALS);
        if (name && value) {
            name = decodeToString(name, encoding);
            value = decodeToString(value, encoding);
            // split "foo[bar][][baz]" into ["foo", "bar", "", "baz", ""]
            var names = name.split(/\]\[|\[|\]/);
            if (names.length > 1) {
                // if there are square brackets in the name, the split
                // produces a superfluous empty string as last element
                names.pop();
            }
            mergeParameter(params, names, value);
        }
    }
}

// transforms query string "foo[bar][][baz]=hello" into
// object structure {foo: {bar: [{baz : "hello"}]}}
function mergeParameter(params, names, value) {
    if (names.length == 1) {
        // a simple property - push or set depending on params' type
        Array.isArray(params) ? params.push(value) : params[names[0]] = value;
    } else {
        // we have a property path - consume first token and recurse
        var name = names.shift();
        if (names[0]) {
            // foo[bar] - parse as object property
            var obj = params[name];
            if (!(obj instanceof Object)) {
                obj = {};
                Array.isArray(params) ? params.push(obj) : params[name] = obj;
            }
            mergeParameter(obj, names, value);
        } else {
            // foo[] - parse as array
            var array = params[name];
            if (!Array.isArray(array)) {
                array = array == null ? [] : [array];
                Array.isArray(params) ? params.push(array) : params[name] = array;
            }
            mergeParameter(array, names, value);
        }
    }
}

// convert + to spaces, decode %ff hex sequences,
// then decode to string using the specified encoding.
function decodeToString(bytes, encoding) {
    var k = 0;
    while((k = bytes.indexOf(PLUS, k)) > -1) {
        bytes[k++] = SPACE;
    }
    var i, j = 0;
    while((i = bytes.indexOf(PERCENT, j)) > -1) {
        j = i;
        while (bytes[i] == PERCENT && i++ <= bytes.length - 3) {
            bytes[j++] = (convertHexDigit(bytes[i++]) << 4)
                        + convertHexDigit(bytes[i++]);
        }
        if (i < bytes.length) {
            bytes.copy(i, bytes.length, bytes, j);
        }
        bytes.length -= i - j;
    }
    return bytes.decodeToString(encoding);
}

function convertHexDigit(byte) {
    if (byte >= CHAR_0 && byte <= CHAR_9)
        return byte - CHAR_0;
    if (byte >= CHAR_a && byte <= CHAR_f)
        return byte - CHAR_a + 10;
    if (byte >= CHAR_A && byte <= CHAR_F)
        return byte - CHAR_A + 10;
    return 0;
}
