
include('binary');

export('isUrlEncoded', 'parseParameters', 'mergeParameter');

var log = require('ringo/logging').getLogger(module.id);

// character codes used for slicing and decoding
var SPACE     = " ".charCodeAt(0);
var PERCENT   = "%".charCodeAt(0);
var AMPERSAND = "&".charCodeAt(0);
var PLUS      = "+".charCodeAt(0);
var EQUALS    = "=".charCodeAt(0);

// character codes used for hex decoding
var CHAR_0 = "0".charCodeAt(0);
var CHAR_9 = "9".charCodeAt(0);
var CHAR_A = "A".charCodeAt(0);
var CHAR_F = "F".charCodeAt(0);
var CHAR_a = "a".charCodeAt(0);
var CHAR_f = "f".charCodeAt(0);

/**
 * Find out whether the content type denotes a format this module can parse.
 * @param contentType a HTTP request Content-Type header
 * @returns true if the content type can be parsed as form data by this module
 */
function isUrlEncoded(contentType) {
    return contentType && String(contentType)
            .toLowerCase().startsWith("application/x-www-form-urlencoded");
}

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
    for each (var param in bytes.split(AMPERSAND)) {
        var [name, value] = param.split(EQUALS);
        if (name && value) {
            name = decodeToString(name, encoding);
            value = decodeToString(value, encoding);
            mergeParameter(params, name.trim(), value);
        }
    }
}

/**
 * Adds a value to a parameter object using a square bracket property syntax.
 * For example, parameter <code>foo[bar][][baz]=hello</code> will result in
 * object structure <code>{foo: {bar: [{baz : "hello"}]}}</code>.
 * @param params the top level parameter object
 * @param name the parameter name
 * @param value the parameter value
 */
function mergeParameter(params, name, value) {
    // split "foo[bar][][baz]" into ["foo", "bar", "", "baz", ""]
    if (name.match(/^\w+(?:\[[^\]]*\]\s*)+$/)) {
        var names = name.split(/\]\s*\[|\[|\]/).map(function(s) s.trim()).slice(0, -1);
        mergeParameterInternal(params, names, value);
    } else {
        // not matching the foo[bar] pattern, add param as is
        params[name] = value;
    }
}

function mergeParameterInternal(params, names, value) {
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
            mergeParameterInternal(obj, names, value);
        } else {
            // foo[] - parse as array
            var array = params[name];
            if (!Array.isArray(array)) {
                array = array == null ? [] : [array];
                Array.isArray(params) ? params.push(array) : params[name] = array;
            }
            mergeParameterInternal(array, names, value);
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
