
require('core/string');
include('ringo/buffer');

module.shared = true;

export('ResponseFilter', 'Headers', 'getMimeParameter');

/**
 * A utility class for implementing JSGI response filters. Each part of the
 * response is first passed to the filter function. If the filter function
 * returns a value, that value is passed on to the JSGI response stream.
 * @param body a JSGI response body
 * @param filter a filter function
 */
function ResponseFilter(body, filter) {
    /**
     * forEach function called by the JSGI connector.
     * @param fn the response handler callback function
     */
    this.forEach = function(fn) {
        body.forEach(function(block) {
            var filtered = filter(block);
            if (filtered != null) {
                fn(filtered);
            }
        });
    };
};

/**
 * Returns an object for use as a HTTP header collection. The returned object
 * provides methods for setting, getting, and deleting its properties in a case-insensitive and
 * case-preserving way.
 *
 * This function can be used as mixin for an existing JavaScript object or as a constructor.
 * @param headers an existing JS object. If undefined, a new object is created
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
     * @param name the header name
     * @returns the header value
     * @name Headers.instance.get
     */
    Object.defineProperty(headers, "get", {
        value: function(key) {
            var value = this[key];
            if (value === undefined) {
                value = (key = keys[key.toLowerCase()]) && this[key];
            }
            return value;
        }
    });

    /**
     * Set the header with the given name to the given value.
     * @param name the header name
     * @param value the header value
     * @name Headers.instance.set
     */
    Object.defineProperty(headers, "set", {
        value: function(key, value) {
            var oldkey = keys[key.toLowerCase()];
            if (oldkey) {
                delete this[oldkey];
            }
            this[key] = value;
            keys[key.toLowerCase()] = key;
        }
    });

    Object.defineProperty(headers, "add", {
        value: function(key, value) {
            if (this[key]) {
                // shortcut
                this[key] = this.key + ", " + value;
                return;
            }
            var lowerkey = key.toLowerCase();
            var oldkey = keys[lowerkey];
            if (oldkey) {
                value = this[oldkey] + ", " + value;
                if (key !== oldkey)
                    delete this[oldkey];
            }
            this[key] = value;
            keys[lowerkey] = key;
        }

    });

    Object.defineProperty(headers, "contains", {
        value: function(key) {
            return Boolean(this[key] !== undefined
                || (key = keys[key.toLowerCase()]) && this[key] !== undefined);
        }
    });

    Object.defineProperty(headers, "unset", {
        value: function(key) {
           key = key.toLowerCase();
            if (key in keys) {
                delete this[keys[key]]
                delete keys[key];
            }
        }
    });

    Object.defineProperty(headers, "toString", {
         value: function() {
            var buffer = new Buffer();
            for (var header in this) {
                buffer.write(header).write(": ").writeln(this[header]);
            }
            return buffer.toString();
        }
    });

    return headers;
}

/**
 * Get a parameter from a MIME header value. For example, calling this function
 * with "Content-Type: text/plain; charset=UTF-8" and "charset" will return "UTF-8".
 * @param headerValue a header value
 * @param paramName a MIME parameter name
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
            if (name.toLowerCase().trim() == paramName) {
                var value = headerValue.slice(eq + 1, end).trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    return value.slice(1, -1).replace('\\\\', '\\').replace('\\"', '"');
                } else if (value.startsWith('<') && value.endsWith('>')) {
                    return value.slice(1, -1);
                }

                return value;
            }
        }
    }
    return null;
};
