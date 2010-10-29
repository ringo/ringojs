/**
 * @fileOverview This module provides a Response helper classes for composing JSGI response objects.
 * The Response class also features a number of static methods for composing special-purpose
 * response objects.
 */

var {ByteArray} = require('binary');
var {Stream} = require('io');
var {Buffer} = require('ringo/buffer');
var {Headers, getMimeParameter} = require('ringo/utils/http');
var {mimeType} = require('./mime');
var dates = require('ringo/utils/dates');
var webenv = require('ringo/webapp/env');

export('Response');

/**
 * A Response helper class for composing text-based HTTP responses.
 * This class also provides a number of static helper methods for
 * composing special-purpose response objects.
 */
function Response() {

    // missing new security belt
    if (!(this instanceof Response)) {
        var response = new Response();
        response.write.apply(response, arguments);
        return response;
    }

    var config = webenv.getConfig();
    var status = 200;
    var charset = config && config.charset || 'utf-8';
    var contentType = config && config.contentType || 'text/html';
    var headers = new Headers({
        'Content-Type' : contentType + "; charset=" + charset
    });
    var body = new Buffer();

    /**
     * Append one or more arguments to the response body.
     */
    this.write = function write() {
        var length = arguments.length;
        for (var i = 0; i < length; i++) {
            body.write(String(arguments[i]));
            if (i < length - 1)
                body.write(' ');
        }
        return this;
    };

    this.write.apply(this, arguments);

    /**
     * Append one or more arguments to the response body,
     * followed by a `'\r\n'` sequence.
     */
    this.writeln = function writeln() {
        this.write.apply(this, arguments);
        body.write('\r\n');
        return this;
    };

    /**
     * Render a skin to the response's buffer
     * @param skin path to skin resource
     * @param context context object
     */
    this.render = function render(skin, context) {
        var render = require('ringo/skin').render;
        body.write(render(skin, context));
    };

    /**
     * The character encoding of the response.
     */
    Object.defineProperty(this, 'charset', {
        get: function() {
            return charset;
        },
        set: function(c) {
            charset = c;
            updateContentType();
        }
    });

    /**
     * The Content-Type of the response.
     */
    Object.defineProperty(this, 'contentType', {
        get: function() {
            return contentType;
        },
        set: function(c) {
            contentType = c;
            updateContentType();
        }
    });

    function updateContentType() {
        if (contentType) {
            if (charset) {
                headers.set("Content-Type", contentType + "; charset=" + charset);
            } else {
                headers.set("Content-Type", contentType);
            }
        } else {
            headers.unset("Content-Type");
        }
    }

    /**
     * The HTTP status code of the response.
     */
    Object.defineProperty(this, 'status', {
        get: function() {
            return status;
        },
        set: function(s) {
            if (isNaN(s)) {
                throw new Error("HTTP status code must be numeric");
            }
            status = s;
        },
        enumerable: true
    });

    /**
     * Property to get or set the response headers.
     */
    Object.defineProperty(this, 'headers', {
        get: function() {
            return headers;
        },
        set: function(h) {
            headers = Headers(h);
        },
        enumerable: true
    });

    /**
     * Property to get or set the response body. While this property can
     * be set to any valid JSGI response body, the `write` and `writeln`
     * methods of this response will only work if the response has a `write`
     * method taking one or more string arguments.
     */
    Object.defineProperty(this, 'body', {
        get: function() {
            return body;
        },
        set: function(b) {
            // Note: if this is set to anything else than a buffer object it will
            // break our write methods
            body = b;
        },
        enumerable: true
    });

    /**
     * Get the response header value for a given key.
     * @param key {String} the header name
     * @returns {String} the header value
     */
    this.getHeader = function(key) {
        return headers.get(String(key));
    };

    /**
     * Set a header to be sent to the client. If a header with this name was previously
     * set it will be replaced.
     * @param {String} key the header name
     * @param {String} value the header value
     * @returns {Response} this response for chainability
     */
    this.setHeader = function(key, value) {
        key = String(key);
        if (key.toLowerCase() == "content-type") {
            this.contentType = String(value);
        } else {
            headers.set(key, String(value));
        }
        return this;
    };

    /**
     * Add a header to be sent to the client. If a header with this name was previously
     * set it will not be replaced.
     * @param {String} key the header name
     * @param {String} value the header value
     * @returns {Response} this response for chainability
     */
    this.addHeader = function(key, value) {
        headers.add(String(key), String(value));
        return this;
    };

    /**
     * Sets a cookie to be sent to the client.
     * All arguments except for key and value are optional.
     * The days argument specifies the number of days until the cookie expires.
     * To delete a cookie immediately, set the days argument to 0. If days is
     * undefined or negative, the cookie is set for the current browser session.
     *
     * @example <pre>res.setCookie("username", "michi");
     * res.setCookie("password", "strenggeheim", 10,
     *               {path: "/mypath", domain: ".mydomain.org"});</pre>
     *
     * @param {String} key the cookie name
     * @param {String} value the cookie value
     * @param {Number} days optional the number of days to keep the cookie.
     *     If this is undefined or -1, the cookie is set for the current session.
     *     If this is 0, the cookie will be deleted immediately.
     * @param {Object} options optional options argument which may contain the following properties:
     *     <ul><li>path - the path on which to set the cookie (defaults to /)</li>
     *     <li>domain -  the domain on which to set the cookie (defaults to current domain)</li>
     *     <li>secure - to only use this cookie for secure connections</li>
     *     <li>httpOnly - to make the cookie inaccessible to client side scripts</li></ul>
     * @since 0.5
     * @return {Response} this response object for chainability;
     */
    this.setCookie = function(key, value, days, options) {
        if (value) {
            // remove newline chars to prevent response splitting attack as value may be user-provided
            value = value.replace(/[\r\n]/g, "");
        }
        var buffer = new Buffer(key, "=", value);
        if (typeof days == "number" && days > -1) {
            var expires = days == 0 ?
                new Date(0) : new Date(Date.now() + days * 1000 * 60 * 60 * 24);
            var cookieDateFormat = "EEE, dd-MMM-yyyy HH:mm:ss zzz";
            buffer.write("; expires=");
            buffer.write(dates.format(expires, cookieDateFormat, "en", "GMT"));
        }
        options = options || {};
        var path = options.path || "/";
        buffer.write("; path=", encodeURI(path));
        if (options.domain) {
            buffer.write("; domain=", options.domain.toLowerCase());
        }
        if (options.secure) {
            buffer.write("; secure");
        }
        if (options.httpOnly) {
            buffer.write("; HttpOnly");
        }
        this.addHeader("Set-Cookie", buffer.toString());
        return this;
    };

}

/**
 * A response object rendered from a skin.
 * @param {Resource|String} skin the skin resource or path
 * @param {Object} context the skin context object
 */
Response.skin = function (skin, context) {
    if (!(skin instanceof org.ringojs.repository.Resource)) {
        skin = getResource(skin);
    }
    var render = require('ringo/skin').render;
    return new Response(render(skin, context));
};

/**
 * Create a response object containing the JSON representation of an object.
 * @param {Object} object the object whose JSON representation to return
 */
Response.json = function (object) {
    var res = new Response(JSON.stringify(object));
    res.contentType = 'application/json';
    return res;
};

/**
 * Create a response containing the given XML document
 * @param {XML|String} xml an XML document
 */
Response.xml = function (xml) {
    var res = new Response(typeof xml === 'xml' ? xml.toXMLString() : xml);
    res.contentType = 'application/xml';
    return res;
};

/**
 * A response representing a static resource.
 * @param {String|Resource} resource the resource to serve
 * @param {String} contentType optional MIME type. If not defined,
 *         the MIME type is detected from the file name extension.
 */
Response.static = function (resource, contentType) {
    if (typeof resource == 'string') {
        resource = getResource(resource);
    }
    if (!(resource instanceof org.ringojs.repository.Resource)) {
        throw Error("Wrong argument for static response: " + typeof(resource));
    }
    if (!resource.exists()) {
        return Response.notFound(String(resource));
    }
    var input;
    return {
        status: 200,
        headers: {
            'Content-Type': contentType || mimeType(resource.name)
        },
        body: {
            digest: function() {
                return resource.lastModified().toString(36)
                    + resource.length.toString(36);
            },
            forEach: function(fn) {
                input = new Stream(resource.getInputStream());
                try {
                    input.forEach(fn);
                } finally {
                    input.close();
                }
            }
        }
    };
};

/**
 * Create a response that redirects the client to a different URL.
 * @param {String} location the new location
 */
Response.redirect = function (location) {
    return {
        status: 303,
        headers: {Location: location},
        body: ["See other: " + location]
    };
};

/**
 * Create a 404 not-found response.
 * @param {String} location the location that couldn't be found
 */
Response.notFound = function (location) {
    var msg = 'Not Found';
    return {
        status: 404,
        headers: {
            'Content-Type': 'text/html'
        },
        body: [ '<html><title>', msg, '</title>',
                '<body><h2>', msg, '</h2>',
                '<p>The requested URL ', String(location), ' was not found on the server.</p>',
                '</body></html>']
    };
};

/**
 * Create a 500 error response.
 * @param {String} msg the message of response body
 */
Response.error = function (msg) {
    return {
        status: 500,
        headers: {'Content-Type': 'text/plain'},
        body: [typeof msg === 'undefined' ? 'Something went wrong.' :
                String(msg)]
    };
};

