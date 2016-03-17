/**
 * @fileOverview This module provides response helper functions for composing
 * JSGI response objects. For more flexibility the `JsgiResponse` is chainable.
 */

var {merge} = require("ringo/utils/objects");
var {mimeType} = require("ringo/mime");

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
        if (!(stream instanceof Stream)) {
            throw Error("Wrong argument for stream response: " + typeof(resource));
        }

        if (!stream.readable()) {
            throw Error("Stream is not readable!");
        }

        this.headers["content-type"] = contentType || "application/octet-stream";
        this.body = stream;

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
 * Merge the given object into the headers of the JSGI response.
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
 * Merge the given object into the headers of the JSGI response.
 * @param {Object} headers new header fields to merge with the current ones.
 * @returns {JsgiResponse} JSGI response with the new headers
 * @name addHeaders
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
["setStatus", "text", "html", "json", "jsonp", "xml", "stream", "setCharset", "addHeaders",
    "ok", "created", "bad", "unauthorized", "forbidden", "notFound", "gone", "error",
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
            "Content-Type": contentType || mimeType(resource.name)
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