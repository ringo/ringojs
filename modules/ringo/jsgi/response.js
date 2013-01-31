/**
 * @fileOverview This module provides response helper functions for composing
 * JSGI response objects.
 */

var {merge} = require("ringo/utils/objects");
var {mimeType} = require("ringo/mime");

/**
 * A wrapper around a JSGI response object. JsgiResponse is chainable until
 * a commit call like ok(), which ends the chain and returns a JSGI response.
 * @param {object} base a base object for the new JSGI response
 * @constructor
 */
var JsgiResponse = exports.JsgiResponse = function(base) {
    // Internal use only
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
 * @param {number} code the status code to use
 * @returns JsgiResponse response with the new status code
 */
Object.defineProperty(JsgiResponse.prototype, "setStatus", {
    value: function(code) {
        this.status = code;
        return this;
    }
});

/**
 * Set the JSGI response content-type to 'text/plain' with the string as response body.
 * @param {string} text... a variable number of strings to send as response body
 * @returns JsgiResponse response with content-type 'text/plain'
 */
Object.defineProperty(JsgiResponse.prototype, "text", {
    value: function() {
        this.headers["content-type"] = "text/plain; charset=" + this._charset;
        this.body = Array.slice(arguments).map(String);
        return this;
    }
});

/**
 * Set the JSGI response content-type to 'text/html' with the string as response body.
 * @param {string} html... a variable number of strings to send as response body
 * @returns JsgiResponse response with content-type 'text/html'
 */
Object.defineProperty(JsgiResponse.prototype, "html", {
    value: function() {
        this.headers["content-type"] = "text/html; charset=" + this._charset;
        this.body = Array.slice(arguments).map(String);
        return this;
    }
});

/**
 * Create a JSGI response with content-type 'application/json' with the JSON
 * representation of the given object as response body.
 * @param {object} object the object whose JSON representation to return
 * @returns JsgiResponse response with content-type 'application/json'
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
 * @param {string} callback the callback function name for a JSONP request
 * @param {object} object the object whose JSON representation to return
 * @returns JsgiResponse response with content-type 'application/javascript'
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
 * @param {xml|string} xml an XML document
 * @returns JsgiResponse response with content-type 'application/xml'
 */
Object.defineProperty(JsgiResponse.prototype, "xml", {
    value: function(xml) {
        this.headers["content-type"] = "application/xml";
        this.body = [(typeof xml === 'xml' ? xml.toXMLString() : String(xml))];
        return this;
    }
});

/**
 * Set the character encoding used for text responses.
 * @param {string} charsetName the encoding to use.
 * @returns JsgiResponse response with the given charset
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
 * @param {object} headers new header fields to merge with the current ones.
 * @returns JsgiResponse response with the new headers
 */
Object.defineProperty(JsgiResponse.prototype, "addHeaders", {
    value: function(headers) {
        this.headers = merge(headers, this.headers);
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 200.
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "ok", {
    value: function() {
        this.status = 200;
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 201.
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "created", {
    value: function() {
        this.status = 201;
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 400.
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "bad", {
    value: function() {
        this.status = 400;
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 401.
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "unauthorized", {
    value: function() { 
        this.status = 401;
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 403.
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "forbidden", {
    value: function() {
        this.status = 403;
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 404.
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "notFound", {
    value: function() {
        this.status = 404;
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 410.
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "gone", {
    value: function() {
        this.status = 410;
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 500.
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "error", {
    value: function() {
        this.status = 500;
        return this;
    }
});

/**
 * Commits the response and returns a JSGI object with HTTP status 503.
 * @returns a JSGI response object to send back
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
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "redirect", {
    value: function(location) {
        this.status = 303;
        this.headers = { "location": location };
        this.body = ["See other: " + location];

        return {
            status: 303,
            headers: { "location": location },
            body: ["See other: " + location]
        };
    }
});

/**
 * Create a response with HTTP status code 304 that indicates the 
 * document has not been modified
 * @returns a JSGI response object to send back
 */
Object.defineProperty(JsgiResponse.prototype, "notModified", {
    value: function() {
        this.status = 304;
        this.headers = {};
        this.body = [""];

        return {
            status: 304,
            headers: {},
            body: [""]
        };
    }
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