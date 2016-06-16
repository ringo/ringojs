/**
 * @fileoverview Provides utility functions to work with HTTP requests and responses.
 * Most methods are useful for low-level operations only.
 * To develop a full-featured web application it’s recommended to use a dedicated
 * web framework like <a href="https://github.com/ringo/stick">stick</a>.
 */

var dates = require('ringo/utils/dates');
var strings = require('ringo/utils/strings');
var {Buffer} = require('ringo/buffer');
var {Binary, ByteArray, ByteString} = require('binary');
var {MemoryStream} = require('io');

// prevents illegal access exceptions in App Engine since
// App Engine doesn't allow any filesystem-related operations
var open = null,
    createTempFile = null;

if (java.lang.System.getProperty("com.google.appengine.runtime.version") == null) {
    open = require('fs').open;
    createTempFile = require('ringo/utils/files').createTempFile;
}

export('ResponseFilter', 'Headers', 'getMimeParameter', 'urlEncode', 'setCookie',
        'isUrlEncoded', 'isFileUpload', 'parseParameters', 'mergeParameter',
        'parseFileUpload', 'BufferFactory', 'TempFileFactory');

var log = require('ringo/logging').getLogger(module.id);

/**
 * A utility class for implementing JSGI response filters. Each part of the
 * response is first passed to the filter function. If the filter function
 * returns a value, that value is passed on to the JSGI response stream.
 * @param {Object} body a JSGI response body
 * @param {Function} filter a filter function
 */
function ResponseFilter(body, filter) {
    /**
     * forEach function called by the JSGI connector.
     * @param {Function} fn the response handler callback function
     */
    this.forEach = function(fn) {
        body.forEach(function(block) {
            var filtered = filter(block);
            if (filtered != null) {
                fn(filtered);
            }
        });
    };
}

/**
 * @ignore interal function, following RFC 7230 section 3.2.2. field order
 */
function sanitizeHeaderValue(fieldValue) {
    return fieldValue.replace(/\n/g, "").trim();
}

/**
 * Returns an object for use as a HTTP request header collection. The returned object
 * provides methods for setting, getting, and deleting its properties in a
 * case-insensitive and case-preserving way. Multiple headers with the same
 * field name will be merged into a comma-separated string. Therefore the
 * <code>Set-Cookie</code> header is not supported by this function.
 *
 * This function can be used as mixin for an existing JavaScript object or as a
 * constructor.
 * @param {Object} headers an existing JS object. If undefined, a new object is
 * created
 */
function Headers(headers) {
    // when is a duck a duck?
    if (headers && headers.get && headers.set) {
        return headers;
    }

    headers = headers || {};
    var keys = {};
    // populate internal lower case to original case map
    for (var key in headers) {
        keys[String(key).toLowerCase()] = key;
    }

    /**
     * Get the value of the header with the given name
     * @param {String} name the header name
     * @returns {String} the header value
     * @name Headers.instance.get
     */
    Object.defineProperty(headers, "get", {
        value: function(key) {
            var value = this[key];
            if (value === undefined) {
                value = (key = keys[key.toLowerCase()]) && this[key];
            }

            return (typeof value === "string" ? sanitizeHeaderValue(value) : value);
        }
    });

    /**
     * Set the header with the given name to the given value.
     * @param {String} name the header name
     * @param {String} value the header value
     * @name Headers.instance.set
     */
    Object.defineProperty(headers, "set", {
        value: function(key, value) {
            value = sanitizeHeaderValue(value);
            var oldkey = keys[key.toLowerCase()];
            if (oldkey) {
                delete this[oldkey];
            }
            this[key] = value;
            keys[key.toLowerCase()] = key;
        }
    });

    /**
     * Add a header with the given name and value.
     * @param {String} name the header name
     * @param {String} value the header value
     * @name Headers.instance.add
     */
    Object.defineProperty(headers, "add", {
        value: function(key, value) {
            value = sanitizeHeaderValue(value);
            if (this[key]) {
                // shortcut
                this[key] = this[key] + "," + value;
                return;
            }
            var lowerkey = key.toLowerCase();
            var oldkey = keys[lowerkey];
            if (oldkey) {
                value = this[oldkey] + "," + value;
                if (key !== oldkey)
                    delete this[oldkey];
            }
            this[key] = value;
            keys[lowerkey] = key;
        }

    });

    /**
     * Queries whether a header with the given name is set
     * @param {String} name the header name
     * @returns {Boolean} true if a header with this name is set
     * @name Headers.instance.contains
     */
    Object.defineProperty(headers, "contains", {
        value: function(key) {
            return Boolean(this[key] !== undefined
                || (key = keys[key.toLowerCase()]) && this[key] !== undefined);
        }
    });

    /**
     * Unsets any cookies with the given name
     * @param {String} name the header name
     * @name Headers.instance.unset
     */
    Object.defineProperty(headers, "unset", {
        value: function(key) {
           key = key.toLowerCase();
            if (key in keys) {
                delete this[keys[key]];
                delete keys[key];
            }
        }
    });

    /**
     * Returns a string representation of the headers in MIME format.
     * @returns {String} a string representation of the headers
     * @name Headers.instance.toString
     */
    Object.defineProperty(headers, "toString", {
         value: function() {
            var buffer = new Buffer();
            for (var key in this) {
                this[key].split("\n").forEach(function(value) {
                    buffer.write(key).write(": ").writeln(value);
                });
            }
            return buffer.toString();
        }
    });

    return headers;
}

/**
 * Get a parameter from a MIME header value. For example, calling this function
 * with "Content-Type: text/plain; charset=UTF-8" and "charset" will return "UTF-8".
 * @param {String} headerValue a header value
 * @param {String} paramName a MIME parameter name
 */
function getMimeParameter(headerValue, paramName) {
    if (!headerValue)
        return null;
    var start, end = 0;
    paramName = paramName.toLowerCase();
    while((start = headerValue.indexOf(";", end)) > -1) {
        end = headerValue.indexOf(";", ++start);
        if (end < 0)
            end = headerValue.length;
        var eq = headerValue.indexOf("=", start);
        if (eq > start && eq < end) {
            var name = headerValue.slice(start, eq);

            // RFC 2231: Specifically, an asterisk at the end of a parameter name acts as an
            // indicator that character set and language information may appear at
            // the beginning of the parameter value.
            if (name.length > 1 && name.charAt(name.length - 1) === "*") {
                name = name.substr(0, name.length - 1);
            }

            if (name.toLowerCase().trim() == paramName) {
                var value = headerValue.slice(eq + 1, end).trim();
                if (strings.startsWith(value, '"') && strings.endsWith(value, '"')) {
                    return value.slice(1, -1).replace(/\\\\/g, '\\').replace(/\\\"/g, '"');
                } else if (strings.startsWith(value, '<') && strings.endsWith(value, '>')) {
                    return value.slice(1, -1);
                }

                return value;
            }
        }
    }
    return null;
}

function encodeObjectComponent(object, prefix, buffer) {
    for (var key in object) {
        let value = object[key];
        let keyStr = Array.isArray(object) ? "" : key;
        if (Array.isArray(value)) {
            encodeObjectComponent(value, prefix + "[" + keyStr + "]", buffer);
        } else if (typeof value === "object") {
            encodeObjectComponent(value, prefix + "[" + keyStr + "]", buffer);
        } else {
            if (buffer.length) buffer.write("&");
            buffer.write(encodeURIComponent(prefix + "[" + keyStr + "]"), "=", encodeURIComponent(value));
        }
    }
}

/**
 * Encode an object's properties into an URL encoded string. If a property contains an array as value,
 * the array will be serialized.
 * @param {Object} object an object
 * @returns {String} a string containing the URL encoded properties of the object
 * @example // "foo=bar%20baz"
 * http.urlEncode({ foo: "bar baz" });
 *
 * // "foo=bar%20baz&foo=2&foo=3"
 * http.urlEncode({ foo: ["bar baz", 2, 3] });
 *
 * // "foo%5Bbar%5D%5B%5D%5Bbaz%5D=hello"
 * http.urlEncode({foo: {bar: [{baz: "hello"}]}});
 */
function urlEncode(object) {
    var buf = new Buffer();
    var key, value;
    for (key in object) {
        value = object[key];
        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                if (buf.length) buf.write("&");
                buf.write(encodeURIComponent(key), "=", encodeURIComponent(value[i]));
            }
        } else if (typeof value === "object") {
            encodeObjectComponent(value, key, buf);
        } else {
            if (buf.length) buf.write("&");
            buf.write(encodeURIComponent(key), "=", encodeURIComponent(value));
        }
    }
    return buf.toString();
}

const PATH_CTL = java.util.regex.Pattern.compile("[\x00-\x1F\x7F\x3B]");

/**
 * Creates value for the Set-Cookie header for creating a cookie with the given
 * name, value, and attributes.
 *
 * All arguments except for key and value are optional.
 * The days argument specifies the number of days until the cookie expires.
 * To delete a cookie immediately, set the days argument to 0. If days is
 * undefined or negative, the cookie is set for the current browser session.
 *
 * @param {String} key the cookie name
 * @param {String} value the cookie value
 * @param {Number|Date} days optional the number of days to keep the cookie, or a Date object
 * with the exact expiry date.
 * If this is undefined or -1, the cookie is set for the current session.
 * If this is 0, the cookie will be deleted immediately.
 * @param {Object} options optional options argument which may contain the following properties:
 * <ul><li>path - the path on which to set the cookie (defaults to /)</li>
 * <li>domain - the domain on which to set the cookie (defaults to current domain)</li>
 * <li>secure - to only use this cookie for secure connections</li>
 * <li>httpOnly - to make the cookie inaccessible to client side scripts</li>
 * <li>sameSite - first-party-only cookie; asserts browsers not to send cookies along with cross-site requests;
 * default is strict enforcement, any other enforcement can be provided as string.</li>
 * </ul>
 * @since 0.8
 * @return {String} the Set-Cookie header value
 * @example setCookie("username", "michi");
 * setCookie("password", "strenggeheim", 10,
 *   {path: "/mypath", domain: ".mydomain.org"});
 *
 * setCookie("foo", "bar", 10,
 *   { httpOnly: true, secure: true, sameSite: true });
 *
 * setCookie("foo", "bar", 10,
 *   { httpOnly: true, secure: true, sameSite: "Lax" })
 */
function setCookie(key, value, days, options) {
    if (value) {
        // remove newline chars to prevent response splitting attack as value may be user-provided
        value = value.replace(/[\r\n]/g, "");
    }
    var buffer = new Buffer(key, "=", value);

    if (days !== undefined) {
        var expires;
        if (typeof days == "number" && days > -1) {
            expires = days == 0 ?
                new Date(0) : new Date(Date.now() + days * 1000 * 60 * 60 * 24);
        } else if (days instanceof Date) {
            expires = days;
        } else {
            throw new Error("Invalid expiration date! ", days);
        }
        buffer.write("; Expires=");
        buffer.write(dates.format(expires, "EEE, dd-MMM-yyyy HH:mm:ss zzz", "en", "GMT"));
    }
    options = options || {};
    if (options.path && (typeof options.path !== "string" || PATH_CTL.matcher(options.path).find())) {
        throw new Error("Cookie path not a string or contains CTL characters (%x00-1F;%x7F)");
    }
    var path = options.path || "/";
    buffer.write("; Path=", encodeURI(path));
    if (options.domain) {
        buffer.write("; Domain=", options.domain.toLowerCase());
    }
    if (options.secure) {
        buffer.write("; Secure");
    }
    if (options.httpOnly) {
        buffer.write("; HttpOnly");
    }
    if (options.sameSite) {
        // https://tools.ietf.org/html/draft-west-first-party-cookies-06#section-4.1
        if (typeof options.sameSite === "string") {
            buffer.write("; SameSite=" + options.sameSite);
        } else {
            buffer.write("; SameSite=Strict");
        }
    }
    return buffer.toString();
}

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

// used for multipart parsing
var HYPHEN  = "-".charCodeAt(0);
var CR = "\r".charCodeAt(0);
var CRLF = new ByteString("\r\n", "ASCII");
var EMPTY_LINE = new ByteString("\r\n\r\n", "ASCII");

/**
 * Find out whether the content type denotes a format this module can parse.
 * @param {String} contentType a HTTP request Content-Type header
 * @returns {Boolean} true if the content type can be parsed as form data by this module
 */
function isUrlEncoded(contentType) {
    return contentType && strings.startsWith(
            String(contentType).toLowerCase(), "application/x-www-form-urlencoded");
}

/**
 * Find out whether the content type denotes a format this module can parse.
 * @param {String} contentType a HTTP request Content-Type header
 * @return {Boolean} true if the content type can be parsed as form data by this module
 */
function isFileUpload(contentType) {
    return contentType && strings.startsWith(
            String(contentType).toLowerCase(), "multipart/form-data");
}


/**
 * Parses a string or binary object representing a query string via an URL or post data into
 * a JavaScript object structure using the specified encoding. It uses the <code>"&amp;"</code>
 * as separator between parameters and <code>"="</code> for assignments.
 * @param {Binary|String} input a Binary object or string containing the
 *        URL-encoded parameters
 * @param {Object} params optional parameter object to parse into. If undefined
 *        a new object is created and returned.
 * @param {String} encoding a valid encoding name, defaults to UTF-8
 * @returns {Object} the parsed parameter object
 * @example parseParameters("a=1&b=2&b=3&c");
 * // returns { a: "1", b: ["2","3"], c: ""}
 *
 * parseParameters("a[]=1&a[]=2&a[]=3");
 * // returns { a: ["1", "2","3"]}
 *
 * parseParameters("foo[bar][baz]=hello&foo[bar][boo]=world");
 * // returns {foo: {bar: {baz: "hello", boo: "world"}}}
 */
function parseParameters(input, params, encoding) {
    if (!input) {
        return params || {};
    } else if (typeof input === "string" || input instanceof ByteString) {
        // stream.read() should really return ByteArray in the first place...
        input = input.toByteArray();
    }
    params = params || {};
    encoding = encoding || "UTF-8";
    for each (var param in input.split(AMPERSAND)) {
        var name, value;

        // single parameter without any value
        if (param.indexOf(EQUALS) < 0) {
            name = param;
            value = new ByteString("", encoding);
        } else {
            [name, value] = param.split(EQUALS, { count: 2 });
        }

        name = decodeToString(name, encoding);
        value = decodeToString(value, encoding);

        // only empty keys are not allowed
        if (name !== "") {
            mergeParameter(params, name, value);
        }
    }
    return params;
}

/**
 * Adds a value to a parameter object using a square bracket property syntax.
 * For example, parameter `foo[bar][][baz]=hello` will result in
 * object structure `{foo: {bar: [{baz : "hello"}]}}`.
 * @param {Object} params the top level parameter object
 * @param {String} name the parameter name
 * @param {String} value the parameter value
 */
function mergeParameter(params, name, value) {
    // split "foo[bar][][baz]" into ["foo", "bar", "", "baz", ""]
    if (name.match(/^[\w_\-\.]+(?:\[[^\]]*\]\s*)+$/)) {
        var names = name.split(/\]\s*\[|\[|\]/).map(function(s) s.trim()).slice(0, -1);
        mergeParameterInternal(params, names, value);
    } else {
        // not matching the foo[bar] pattern, add param as is
        if (!params.hasOwnProperty(name)) {
            params[name] = value;
        } else {
            // is parameter a single-key param?
            if (!Array.isArray(params[name])) {
                // convert the parameter to a value array
                params[name] = [params[name], value];
            } else {
                // push to the existing value array
                params[name].push(value);
            }
        }
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

/**
 * Parses a multipart MIME input stream.
 * Parses a multipart MIME input stream.
 * @param {Object} request the JSGI request object
 * @param {Object} params the parameter object to parse into. If not defined
 *        a new object is created and returned.
 * @param {String} encoding optional encoding to apply to non-file parameters.
 *        Defaults to "UTF-8".
 * @param {Function} streamFactory factory function to create streams for mime parts
 * @returns {Object} the parsed parameter object
 */
function parseFileUpload(request, params, encoding, streamFactory) {
    params = params || {};
    encoding = encoding || "UTF-8";
    streamFactory = streamFactory || BufferFactory;
    var boundary = getMimeParameter(request.headers["content-type"], "boundary");
    if (!boundary) {
        return params;
    }
    boundary = new ByteArray("--" + boundary, "ASCII");
    var input = request.input;
    var buflen = 8192;
    var refillThreshold = 1024; // minimum fill to start parsing
    var buffer = new ByteArray(buflen); // input buffer
    var data;  // data object for current mime part properties
    var stream; // stream to write current mime part to
    var eof = false;
    // the central variables for managing the buffer:
    // current position and end of read bytes
    var position = 0, limit = 0;

    var refill = function(waitForMore) {
        if (position > 0) {
            // "compact" buffer
            if (position < limit) {
                buffer.copy(position, limit, buffer, 0);
                limit -= position;
                position = 0;
            } else {
                position = limit = 0;
            }
        }
        // read into buffer starting at limit
        var totalRead = 0;
        do {
            var read = input.readInto(buffer, limit, buffer.length);
            if (read > -1) {
                totalRead += read;
                limit += read;
            } else {
                eof = true;
            }
        } while (waitForMore && !eof && limit < buffer.length);
        return totalRead;
    };

    refill();

    while (position < limit) {
        if (!data) {
            // refill buffer if we don't have enough fresh bytes
            if (!eof && limit - position < refillThreshold) {
                refill(true);
            }
            var boundaryPos = buffer.indexOf(boundary, position, limit);
            if (boundaryPos < 0) {
                throw new Error("boundary not found in multipart stream");
            }
            // move position past boundary to beginning of multipart headers
            position = boundaryPos + boundary.length + CRLF.length;
            if (buffer[position - 2] == HYPHEN && buffer[position - 1] == HYPHEN) {
                // reached final boundary
                break;
            }
            var b = buffer.indexOf(EMPTY_LINE, position, limit);
            if (b < 0) {
                throw new Error("could not parse headers");
            }
            data = {};
            var headers = [];
            buffer.slice(position, b).split(CRLF).forEach(function(line) {
                line = line.decodeToString(encoding);
                // unfold multiline headers
                if ((strings.startsWith(line, " ") || strings.startsWith(line, "\t")) && headers.length) {
                    arrays.peek(headers) += line;
                } else {
                    headers.push(line);
                }
            });
            for each (var header in headers) {
                if (strings.startsWith(header.toLowerCase(), "content-disposition:")) {
                    data.name = getMimeParameter(header, "name");
                    data.filename = getMimeParameter(header, "filename");
                } else if (strings.startsWith(header.toLowerCase(), "content-type:")) {
                    data.contentType = header.substring(13).trim();
                }
            }
            // move position after the empty line that separates headers from body
            position = b + EMPTY_LINE.length;
            // create stream for mime part
            stream = streamFactory(data, encoding);
        }
        boundaryPos = buffer.indexOf(boundary, position, limit);
        if (boundaryPos < 0) {
            // no terminating boundary found, slurp bytes and check for
            // partial boundary at buffer end which we know starts with "\r\n--"
            // but we just check for \r to keep it simple.
            var cr = buffer.indexOf(CR, Math.max(position, limit - boundary.length - 2), limit);
            var end =  (cr < 0) ? limit : cr;
            stream.write(buffer, position, end);
            // stream.flush();
            position = end;
            if (!eof) {
                refill();
            }
        } else {
            // found terminating boundary, complete data and merge into parameters
            stream.write(buffer, position, boundaryPos - 2);
            stream.close();
            position = boundaryPos;
            if (typeof data.value === "string") {
                mergeParameter(params, data.name, data.value);
            } else {
                mergeParameter(params, data.name, data);
            }
            data = stream = null;
        }
    }
    return params;
}

/**
 * A stream factory that stores file upload in a memory buffer. This
 * function is not meant to be called directly but to be passed as streamFactory
 * argument to [parseFileUpload()](#parseFileUpload).
 *
 * The buffer is stored in the `value` property of the parameter's data object.
 * @param {Object} data
 * @param {String} encoding
 */
function BufferFactory(data, encoding) {
    var isFile = data.filename != null;
    var stream = new MemoryStream();
    var close = stream.close;
    // overwrite stream.close to set the part's content in data
    stream.close = function() {
        close.apply(stream);
        // set value property to binary for file uploads, string for form data
        if (isFile) {
            data.value = stream.content;
        } else {
            data.value = stream.content.decodeToString(encoding);
        }
    };
    return stream;
}

/**
 * A stream factory that stores file uploads in temporary files. This
 * function is not meant to be called directly but to be passed as streamFactory
 * argument to [parseFileUpload()](#parseFileUpload).
 *
 * The name of the temporary file is stored in the `tempfile` property
 * of the parameter's data object.
 * @param {Object} data
 * @param {String} encoding
 */
function TempFileFactory(data, encoding) {
    if (data.filename == null) {
        // use in-memory streams for form data
        return BufferFactory(data, encoding)
    }
    data.tempfile = createTempFile("ringo-upload-");
    return open(data.tempfile, {write: true, binary: true});
}
