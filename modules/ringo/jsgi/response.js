/**
 * @fileOverview This module provides response helper functions for composing
 * JSGI response objects. For more flexibility the `JsgiResponse` is chainable.
 */

const fs = require("fs");
var {parseRange, canonicalRanges} = require("ringo/utils/http");
var {mimeType} = require("ringo/mime");
var {Stream, MemoryStream} = require("io");
var {AsyncResponse} = require("./connector");

const HYPHEN  = new ByteString("-", "ASCII");
const CRLF = new ByteString("\r\n", "ASCII");
const EMPTY_LINE = new ByteString("\r\n\r\n", "ASCII");

/**
 * A wrapper around a JSGI response object. `JsgiResponse` is chainable.
 * @param {Object} base a base object for the new JSGI response with the
 *                 initial <code>status</code>, <code>headers</code> and
 *                 <code>body</code> properties.
 * @constructor
 * @example // Using the constructor
 * var {JsgiResponse} = require('ringo/jsgi/response');
 * return (new JsgiResponse()).text('Hello World!').setCharset('ISO-8859-1');
 *
 * // Using a static helper
 * var response = require('ringo/jsgi/response');
 * return response.json({'foo': 'bar'}).error();
 */
var JsgiResponse = exports.JsgiResponse = function(base) {
    // Internal use only
    /** @ignore */
    Object.defineProperty(this, "_charset", {
        value: "utf-8",
        writable: true,
    });

    this.status = 200;
    this.headers = { "content-type": "text/plain; charset=" + this._charset };
    this.body = [""];

    if (base !== undefined) {
        this.status = base.status || this.status;
        this.headers = base.headers || this.headers;
        this.body = base.body || this.body;
    }
};

/**
 * Set the JSGI response status. This does not commit the
 * request and continues the JsgiReponse chain.
 * @param {Number} code the status code to use
 * @returns {JsgiResponse} JSGI response with the new status code
 */
Object.defineProperty(JsgiResponse.prototype, "setStatus", {
    value: function(code) {
        this.status = code;
        return this;
    }
});

/**
 * Set the JSGI response content-type to 'text/plain' with the string as response body.
 * @param {String...} text... a variable number of strings to send as response body
 * @returns {JsgiResponse} JSGI response with content-type 'text/plain'
 */
Object.defineProperty(JsgiResponse.prototype, "text", {
    value: function() {
        this.headers["content-type"] = "text/plain; charset=" + this._charset;
        this.body = Array.prototype.slice.call(arguments).map(String);
        return this;
    }
});

/**
 * Set the JSGI response content-type to 'text/html' with the string as response body.
 * @param {String...} html... a variable number of strings to send as response body
 * @returns {JsgiResponse} JSGI response with content-type 'text/html'
 */
Object.defineProperty(JsgiResponse.prototype, "html", {
    value: function() {
        this.headers["content-type"] = "text/html; charset=" + this._charset;
        this.body = Array.prototype.slice.call(arguments).map(String);
        return this;
    }
});

/**
 * Create a JSGI response with content-type 'application/json' with the JSON
 * representation of the given object as response body.
 * @param {Object} object the object whose JSON representation to return
 * @returns {JsgiResponse} JSGI response with content-type 'application/json'
 */
Object.defineProperty(JsgiResponse.prototype, "json", {
    value: function(object) {
        this.headers["content-type"] = "application/json; charset=" + this._charset;
        this.body = [JSON.stringify(object)];
        return this;
    }
});

/**
 * Create a JSGI response with content-type 'application/javascript' with the JSONP
 * representation of the given object as response body wrapped by the callback name.
 * @param {String} callback the callback function name for a JSONP request
 * @param {Object} object the object whose JSON representation to return
 * @returns {JsgiResponse} JSGI response with content-type 'application/javascript'
 */
Object.defineProperty(JsgiResponse.prototype, "jsonp", {
    value: function(callback, object) {
        this.headers["content-type"] = "application/javascript; charset=" + this._charset;
        this.body = [callback, "(", JSON.stringify(object), ");"];
        return this;
    }
});

/**
 * Create a JSGI response with content-type 'application/xml' with the given
 * XML as response body.
 * @param {XML|String} xml an XML document
 * @returns {JsgiResponse} JSGI response with content-type 'application/xml'
 */
Object.defineProperty(JsgiResponse.prototype, "xml", {
    value: function(xml) {
        this.headers["content-type"] = "application/xml";
        this.body = [(typeof xml === 'xml' ? xml.toXMLString() : String(xml))];
        return this;
    }
});

/**
 * Create a JSGI response with a stream as response body.
 * @param {Stream} stream the stream to write
 * @param {String} contentType optional MIME type. If not defined,
 *         the MIME type is <code>application/octet-stream</code>.
 * @returns {JsgiResponse} JSGI response
 */
Object.defineProperty(JsgiResponse.prototype, "stream", {
    value: function (stream, contentType) {
        if (typeof stream.readable !== "function" || typeof stream.forEach !== "function") {
            throw Error("Wrong argument for stream response!");
        }

        if (!stream.readable()) {
            throw Error("Stream is not readable!");
        }

        this.headers["content-type"] = contentType || "application/octet-stream";
        this.body = {
            forEach: function(fn) {
                try {
                    stream.forEach(fn);
                } finally {
                    stream.close();
                }
            }
        };

        return this;
    }
});

/**
 * Create a JSGI response with a <code>Binary</code> object as response body.
 * @param {ByteString|ByteArray} binary the binary object to write
 * @param {String} contentType optional MIME type. If not defined,
 *         the MIME type is <code>application/octet-stream</code>.
 * @returns {JsgiResponse} JSGI response
 */
Object.defineProperty(JsgiResponse.prototype, "binary", {
    value: function (binary, contentType) {
        if (!(binary instanceof Binary)) {
            throw Error("Wrong argument for binary response!");
        }

        this.headers["content-type"] = contentType || "application/octet-stream";
        this.body = {
            forEach: function(fn) {
                fn(binary);
            }
        };

        return this;
    }
});

/**
 * Set the character encoding used for text responses.
 * @param {String} charsetName the encoding to use.
 * @returns {JsgiResponse} JSGI response with the given charset
 */
Object.defineProperty(JsgiResponse.prototype, "setCharset", {
    value: function(charsetName) {
        this._charset = charsetName;
        var ct = this.headers["content-type"];
        if (ct) {
            this.headers["content-type"] = ct.substring(0, ct.indexOf("; charset=")) +
                "; charset=" + this._charset;
        }
        return this;
    }
});

/**
 * Set the content type for the current response.
 * @param {String} contentType the content type header value.
 * @returns {JsgiResponse} JSGI response with the given charset
 */
Object.defineProperty(JsgiResponse.prototype, "setContentType", {
    value: function(contentType) {
        this.headers["content-type"] = String(contentType);
        return this;
    }
});

/**
 * Merge the given object into the headers of the JSGI response.
 * Note that header field names are case-sensitive in the `JsgiResponse` object, whereas
 * they are not in the final HTTP response message sent out by Jetty.
 * @param {Object} headers new header fields to merge with the current ones.
 * @returns {JsgiResponse} JSGI response with the new headers
 */
Object.defineProperty(JsgiResponse.prototype, "addHeaders", {
    value: function(additionalHeaders) {
        for (let fieldName in additionalHeaders) {
            let existingValues = this.headers[fieldName];

            // check if the header is already set
            if (existingValues === undefined) {
                if (additionalHeaders[fieldName] instanceof Array) {
                    // add multiple header values as an array of strings
                    this.headers[fieldName] = additionalHeaders[fieldName].map(function(headerValue) {
                        return String(headerValue);
                    });
                } else {
                    // single-valued header as arbitrary string
                    this.headers[fieldName] = String(additionalHeaders[fieldName]);
                }
            } else if (typeof existingValues === "string") {
                // the header has been set already exactly once, so expand it to an array
                this.headers[fieldName] = [existingValues, String(additionalHeaders[fieldName])];
            } else {
                // the header is already an array of multiple values --> push new value
                this.headers[fieldName].push(String(additionalHeaders[fieldName]));
            }
        }
        return this;
    }
});

/**
 * Merge the given object into the headers of the JSGI response.
 * Existing headers in the to-be-sent headers will be replaced with the new ones.
 * Note that header field names are case-sensitive in the `JsgiResponse` object, whereas
 * they are not in the final HTTP response message sent out by Jetty.
 * @param {Object} headers new headers to be set
 * @returns {JsgiResponse} JSGI response with the new headers
 */
Object.defineProperty(JsgiResponse.prototype, "setHeaders", {
    value: function(headersToSet) {
        // delete already existing headers
        for (let fieldName in headersToSet) {
            if (this.headers[fieldName] !== undefined) {
                delete this.headers[fieldName];
            }
        }
        this.addHeaders(headersToSet);
        return this;
    }
});

/**
 * Sets the HTTP status to 200.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "ok", {
    value: function() {
        this.status = 200;
        return this;
    }
});

/**
 * Sets the HTTP status to 201.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "created", {
    value: function() {
        this.status = 201;
        return this;
    }
});

/**
 * Sets the HTTP status to 400.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "bad", {
    value: function() {
        this.status = 400;
        return this;
    }
});

/**
 * Sets the HTTP status to 401.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "unauthorized", {
    value: function() {
        this.status = 401;
        return this;
    }
});

/**
 * Sets the HTTP status to 403.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "forbidden", {
    value: function() {
        this.status = 403;
        return this;
    }
});

/**
 * Sets the HTTP status to 404.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "notFound", {
    value: function() {
        this.status = 404;
        return this;
    }
});

/**
 * Sets the HTTP status to 410.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "gone", {
    value: function() {
        this.status = 410;
        return this;
    }
});

/**
 * Sets the HTTP status to 500.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "error", {
    value: function() {
        this.status = 500;
        return this;
    }
});

/**
 * Sets the HTTP status to 503.
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "unavailable", {
    value: function() {
        this.status = 503;
        return this;
    }
});

/**
 * Create a response with HTTP status code 303 that redirects the client
 * to a new location.
 * @param {String} location the new location
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "redirect", {
    value: function(location) {
        this.status = 303;
        this.headers = { "location": location };
        this.body = ["See other: " + location];
        return this;
    }
});

/**
 * Create a response with HTTP status code 304 that indicates the
 * document has not been modified
 * @returns {JsgiResponse} a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "notModified", {
    value: function() {
        this.status = 304;
        this.headers = {};
        this.body = [""];
        return this;
    }
});

/**
 * Static helper to create a `JsgiResponse` with the given status code.
 * @name setStatus
 * @function
 * @param {Number} code the status code to use
 * @returns {JsgiResponse} JSGI response with the new status code
 */

/**
 * Set the JSGI response content-type to 'text/plain' with the string as response body.
 * @param {String...} text... a variable number of strings to send as response body
 * @returns {JsgiResponse} JSGI response with content-type 'text/plain'
 * @name text
 * @function
 */

/**
 * Set the JSGI response content-type to 'text/html' with the string as response body.
 * @param {String...} html... a variable number of strings to send as response body
 * @returns {JsgiResponse} JSGI response with content-type 'text/html'
 * @name html
 * @function
 */

/**
 * Create a JSGI response with content-type 'application/json' with the JSON
 * representation of the given object as response body.
 * @param {Object} object the object whose JSON representation to return
 * @returns {JsgiResponse} JSGI response with content-type 'application/json'
 * @name json
 * @function
 */

/**
 * Create a JSGI response with content-type 'application/javascript' with the JSONP
 * representation of the given object as response body wrapped by the callback name.
 * @param {String} callback the callback function name for a JSONP request
 * @param {Object} object the object whose JSON representation to return
 * @returns {JsgiResponse} JSGI response with content-type 'application/javascript'
 * @name jsonp
 * @function
 */

/**
 * Create a JSGI response with content-type 'application/xml' with the given
 * XML as response body.
 * @param {XML|String} xml an XML document
 * @returns {JsgiResponse} JSGI response with content-type 'application/xml'
 * @name xml
 * @function
 */

/**
 * Set the character encoding used for text responses.
 * @param {String} charsetName the encoding to use.
 * @returns {JsgiResponse} JSGI response with the given charset
 * @name setCharset
 * @function
 */

/**
 * Set the content type for the current response.
 * @param {String} contentType the content type header value.
 * @returns {JsgiResponse} JSGI response with the given charset
 * @name setContentType
 * @function
 */

/**
 * Merge the given object into the headers of the JSGI response.
 * @param {Object} headers new header fields to merge with the current ones.
 * @returns {JsgiResponse} JSGI response with the new headers
 * @name addHeaders
 * @function
 */

/**
 * Merge the given object into the headers of the JSGI response.
 * Existing headers in the to-be-sent headers will be replaced with the new ones.
 * @param {Object} headers new headers to be set
 * @returns {JsgiResponse} JSGI response with the new headers
 * @name setHeaders
 * @function
 */

/**
 * Sets the HTTP status to 200.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name ok
 * @function
 */

/**
 * Sets the HTTP status to 201.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name created
 * @function
 */

/**
 * Sets the HTTP status to 400.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name bad
 * @function
 */

/**
 * Sets the HTTP status to 401.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name unauthorized
 * @function
 */

/**
 * Sets the HTTP status to 403.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name forbidden
 * @function
 */

/**
 * Sets the HTTP status to 404.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name notFound
 * @function
 */

/**
 * Sets the HTTP status to 410.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name gone
 * @function
 */

/**
 * Sets the HTTP status to 500.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name error
 * @function
 */

/**
 * Sets the HTTP status to 503.
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name unavailable
 * @function
 */

/**
 * Create a response with HTTP status code 303 that redirects the client
 * to a new location.
 * @param {String} location the new location
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name redirect
 * @function
 */

/**
 * Create a response with HTTP status code 304 that indicates the
 * document has not been modified
 * @returns {JsgiResponse} a JSGI response object to send back
 * @name notModified
 * @function
 */

// Define helper functions
/** @ignore */
["setStatus", "text", "html", "json", "jsonp", "xml", "stream", "binary", "setCharset", "addHeaders", "setHeaders",
    "setContentType", "ok", "created", "bad", "unauthorized", "forbidden", "notFound", "gone", "error",
    "unavailable", "redirect", "notModified"].forEach(function(functionName) {
    exports[functionName] = function() {
        return JsgiResponse.prototype[functionName].apply((new JsgiResponse()), arguments);
    };
});

/**
 * A response representing a static resource.
 * @param {String|Resource} resource the resource to serve
 * @param {String} contentType optional MIME type. If not defined,
 *         the MIME type is detected from the file name extension.
 */
exports.static = function (resource, contentType) {
    if (typeof resource == "string") {
        resource = getResource(resource);
    }
    if (!(resource instanceof org.ringojs.repository.Resource)) {
        throw Error("Wrong argument for static response: " + typeof(resource));
    }

    var input;
    return {
        status: 200,
        headers: {
            "content-type": contentType || mimeType(resource.name)
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
 * An async response representing a resource as a single or multiple part response.
 * Multiple or overlapping byte ranges are coalesced into a canonical response range.
 *
 * @param {Object} request a JSGI request object
 * @param {String|Resource|Stream} representation path of a file as string, a resource, or a readable <a href="../../../io/">io.Stream</a>
 * @param {Number} size optional size of the resource in bytes, -1 indicates an unknown size.
 * @param {String} contentType optional content type to send for single range responses
 * @param {Number} timeout optional timeout to send back the ranges, defaults to 30 seconds, -1 indicates an infinite timeout.
 * @param {Number} maxRanges optional maximum number of ranges in a request, defaults to 20. Similar to Apache's <code>MaxRanges</code> directive.
 * @returns {AsyncResponse} async response filled with the give ranges
 * @see <a href="https://tools.ietf.org/html/rfc7233">RFC 7233 - Range Requests</a>
 * @see <a href="https://tools.ietf.org/html/rfc7233#section-6">Range Requests - Security Considerations</a>
 */
exports.range = function (request, representation, size, contentType, timeout, maxRanges) {
    // this would be an application error --> throw an exception
    if (!request || !request.headers || !request.headers["range"]) {
        throw new Error("Request is not a range request!");
    }

    // only GET is allowed
    // https://tools.ietf.org/html/rfc7233#section-3.1
    if (request.method !== "GET") {
        return new JsgiResponse().setStatus(400).text("Method not allowed.");
    }

    let stream;
    if (typeof representation == "string") {
        let localPath = fs.absolute(representation);
        if (!fs.exists(localPath) || !fs.isReadable(localPath)) {
            throw new Error("Resource does not exist or is not readable.");
        }

        if (size == null) {
            try {
                size = fs.size(localPath);
            } catch (e) {
                // ignore --> use -1 at the end
            }
        }

        stream = fs.openRaw(localPath, "r");
    } else if (representation instanceof org.ringojs.repository.Resource) {
        stream = new Stream(representation.getInputStream());
        if (size == null && representation.getLength != null) {
            size = representation.getLength();
        }
    } else if (representation instanceof Stream) {
        stream = representation;
    } else {
        throw new Error("Invalid representation! Must be a path to a file, a resource, or a stream.");
    }

    if (!stream.readable()) {
        throw new Error("Stream must be readable!");
    }

    const BOUNDARY = new ByteString("sjognir_doro_" +
        java.lang.System.identityHashCode(this).toString(36) +
        java.lang.System.identityHashCode(request).toString(36) +
        java.lang.System.identityHashCode(stream).toString(36) +
        (java.lang.System.currentTimeMillis() % 100000).toString(36) +
        (Math.random().toFixed(10).slice(2)), "ASCII");

    contentType = contentType || "application/octet-stream";
    maxRanges = (maxRanges != null && Number.isSafeInteger(maxRanges) && maxRanges >= 0 ? maxRanges : 20);

    // returns the raw ranges; might be overlapping / invalid
    let ranges = parseRange(request.headers["range"], size);
    if (ranges == null || ranges.length === 0 || ranges.length > maxRanges) {
        return new JsgiResponse().setStatus(416).text("Invalid Range header!");
    }

    // make ranges canonical and check their validity
    // https://tools.ietf.org/html/rfc7233#section-4.3
    try {
        ranges = canonicalRanges(ranges);
    } catch (e) {
        let invalidRangeResponse = new JsgiResponse().setStatus(416).text("Range Not Satisfiable");
        if (size != null) {
            invalidRangeResponse.addHeaders({
                "content-range": "bytes */" + size
            });
        }
        return invalidRangeResponse;
    }

    // check if range can be fulfilled
    if(size != null && ranges[ranges.length - 1][1] > size) {
        return new JsgiResponse().setStatus(416).addHeaders({
            "content-range": "bytes */" + size
        }).text("Range Not Satisfiable");
    }

    const {servletResponse} = request.env;
    servletResponse.setStatus(206);
    if (ranges.length > 1) {
        servletResponse.setHeader("content-type", "multipart/byteranges; boundary=" + BOUNDARY.decodeToString("ASCII"));
    } else {
        servletResponse.setHeader("content-type", contentType);
        servletResponse.setHeader("content-range", "bytes " + ranges[0].join("-") + "/" + size);
        servletResponse.setContentLengthLong(ranges[0][1] - ranges[0][0] + 1);
    }

    const outStream = servletResponse.getOutputStream();
    const responseBufferSize = Math.max(request.env.servletResponse.getBufferSize() - 70, 8192);

    try {
        let currentBytePos = 0;
        ranges.forEach(function(range, index, arr) {
            const [start, end] = range;
            const numBytes = end - start + 1;
            const rounds = Math.floor(numBytes / responseBufferSize);
            const restBytes = numBytes % responseBufferSize;

            stream.skip(start - currentBytePos);

            if (arr.length > 1) {
                const boundary = new MemoryStream(70);
                if (index > 0) {
                    boundary.write(CRLF);
                }
                boundary.write(HYPHEN);
                boundary.write(HYPHEN);
                boundary.write(BOUNDARY);
                boundary.write(CRLF);
                boundary.write(new ByteString("Content-Type: " + contentType, "ASCII"));
                boundary.write(CRLF);
                boundary.write(new ByteString("Content-Range: bytes " + range.join("-") + "/" + (size >= 0 ? size : "*"), "ASCII"));
                boundary.write(EMPTY_LINE);

                boundary.position = 0;
                outStream.write(boundary.read().unwrap());
                boundary.close();
            }

            for (let i = 0; i < rounds; i++) {
                outStream.write(stream.read(responseBufferSize).unwrap());
            }
            if (restBytes > 0) {
                outStream.write(stream.read(restBytes).unwrap());
            }

            if (arr.length > 1 && index === arr.length - 1) {
                // final boundary
                const eofBoundary = new MemoryStream(70);
                eofBoundary.write(CRLF);
                eofBoundary.write(HYPHEN);
                eofBoundary.write(HYPHEN);
                eofBoundary.write(BOUNDARY);
                eofBoundary.write(HYPHEN);
                eofBoundary.write(HYPHEN);
                eofBoundary.position = 0;
                outStream.write(eofBoundary.read().unwrap());
                eofBoundary.close();
            }

            currentBytePos = end + 1;
        });

        // commit response
        servletResponse.flushBuffer();
    } catch (e if e.javaException instanceof org.eclipse.jetty.io.EofException) {
        // no problem, remote client closed connection ...
    }

    return {
        status: -1,
        headers: {
            "x-jsgi-skip-response": "true"
        },
        body: {}
    };
};