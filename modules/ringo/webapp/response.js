/**
 * @fileOverview This module provides a Response helper classes for composing JSGI response objects.
 * The Response class also features a number of static methods for composing special-purpose
 * response objects.
 */

var {ByteArray, Binary} = require('binary');
var {Stream} = require('io');
var {Buffer} = require('ringo/buffer');
var {Headers, getMimeParameter} = require('./util');
var {mimeType} = require('./mime');
var {writeHeaders} = require('ringo/jsgi');
var dates = require('ringo/utils/dates');
var webenv = require('ringo/webapp/env');

export('Response', 'AsyncResponse');

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
                var read, bufsize = 8192;
                var buffer = new ByteArray(bufsize);
                input = new Stream(resource.getInputStream());
                while ((read = input.readInto(buffer)) > -1) {
                    buffer.length = read;
                    fn(buffer);
                    buffer.length = bufsize;
                }
            },
            close: function() {
                if (input) {
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

/**
 * Creates a streaming asynchronous response. The returned response object can be used
 * both synchronously from the current thread or asynchronously from another thread,
 * even after the original thread has finished execution. AsyncResponse objects are
 * threadsafe.
 * @param {Object} request the JSGI request object
 * @param {Number} timeout the response timeout in milliseconds. Defaults to 30 seconds.
 * @param {Boolean} autoflush whether to flush after each write.
 */
function AsyncResponse(request, timeout, autoflush) {
    var req = request.env.servletRequest;
    var res = request.env.servletResponse;
    var state = 0; // 1: headers written, 2: closed
    var continuation;
    return {
        /**
         * Set the HTTP status code and headers of the response. This method must only
         * be called once.
         * @param {Number} status the HTTP status code
         * @param {Object} headers the headers
         * @returns this response object for chaining
         * @name AsyncResponse.prototype.start
         */
        start: sync(function(status, headers) {
            if (state > 0) {
                throw new Error("start() must only be called once");
            }
            state = 1;
            if (continuation) {
                res = continuation.getServletResponse();
            }
            res.setStatus(status);
            writeHeaders(res, headers || {});
            return this;
        }),
        /**
          * Write a chunk of data to the response stream.
          * @param {String|Binary} data a binary or string
          * @param {String} [encoding] the encoding to use
          * @returns this response object for chaining
          * @name AsyncResponse.prototype.write
          */
         write: sync(function(data, encoding) {
            if (state == 2) {
                throw new Error("Response has been closed");
            }
            state = 1;
            if (continuation) {
                res = continuation.getServletResponse();
            }
            var out = res.getOutputStream();
            data = data instanceof Binary ? data : String(data).toByteArray(encoding);
            out.write(data);
            if (autoflush) {
                out.flush();
            }
            return this;
        }),
        /**
          * Flush the response stream, causing all buffered data to be written
          * to the client.
          * @returns this response object for chaining
          * @name AsyncResponse.prototype.flush
          */
        flush: sync(function() {
            if (state == 2) {
                throw new Error("Response has been closed");
            }
            state = 1;
            if (continuation) {
                res = continuation.getServletResponse();
            }
            res.getOutputStream().flush();
            return this;
        }),
        /**
          * Close the response stream, causing all buffered data to be written
          * to the client.
          * @function
          * @name AsyncResponse.prototype.close
          */
        close: sync(function() {
            if (state == 2) {
                throw new Error("close() must only be called once");
            }
            state = 2;
            if (continuation) {
                res = continuation.getServletResponse();
            }
            res.getOutputStream().close();
            if (continuation) {
                continuation.complete();
            }
        }),
        // Used internally by ringo/jsgi
        suspend: sync(function() {
            if (state < 2) {
                var {ContinuationSupport} = org.eclipse.jetty.continuation;
                continuation = ContinuationSupport.getContinuation(req);
                continuation.setTimeout(timeout || 30000);
                continuation.suspend(res);
            }
        })
    };
};
