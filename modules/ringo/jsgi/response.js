/**
 * @fileOverview This module provides response helper functions for composing
 * JSGI response objects.
 */

var {merge} = require("ringo/utils/objects");
var {mimeType} = require("ringo/mime");

/**
 * A wrapper around a JSGI response object. JsgiResponse is chainable until
 * a commit call like ok(), which ends the chain and returns a JSGI response.
 * @constructor
 */
var JsgiResponse = exports.JsgiResponse = function() {
    var charset = "utf-8";
    var response = {
        status: 200,
        headers: {},
        body: [""]
    };

    /**
     * Set the JSGI response status. This does not commit the
     * request and continues the JsgiReponse chain.
     * @param {number} code the status code to use
     * @returns JsgiResponse response with the new status code
     */
    this.status = function(code) {
        response.status = code;
        return this;
    };

    /**
     * Set the JSGI response content-type to 'text/plain' with the string as response body.
     * @param {string} text... a variable number of strings to send as response body
     * @returns JsgiResponse response with content-type 'text/plain'
     */
    this.text = function() {
        response.headers["Content-Type"] = "text/plain; charset=" + charset;
        response.body = Array.slice(arguments).map(String);
        return this;
    };

    /**
     * Set the JSGI response content-type to 'text/html' with the string as response body.
     * @param {string} html... a variable number of strings to send as response body
     * @returns JsgiResponse response with content-type 'text/html'
     */
    this.html = function() {
        response.headers["Content-Type"] = "text/html; charset=" + charset;
        response.body = Array.slice(arguments).map(String);
        return this;
    };

    /**
     * Create a JSGI response with content-type 'application/json' with the JSON
     * representation of the given object as response body.
     * @param {object} object the object whose JSON representation to return
     * @returns JsgiResponse response with content-type 'application/json'
     */
    this.json = function(object) {
        response.headers["Content-Type"] = "application/json; charset=" + charset;
        response.body = [JSON.stringify(object)];
        return this;
    };

    /**
     * Create a JSGI response with content-type 'application/javascript' with the JSONP
     * representation of the given object as response body wrapped by the callback name.
     * @param {string} callback the callback function name for a JSONP request
     * @param {object} object the object whose JSON representation to return
     * @returns JsgiResponse response with content-type 'application/javascript'
     */
    this.jsonp = function(callback, object) {
        response.headers["Content-Type"] = "application/javascript; charset=" + charset;
        response.body = [callback, "(", JSON.stringify(object), ");"];
        return this;
    };

    /**
     * Create a JSGI response with content-type 'application/xml' with the given
     * XML as response body.
     * @param {xml|string} xml an XML document
     * @returns JsgiResponse response with content-type 'application/xml'
     */
    this.xml = function(xml) {
        response.headers["Content-Type"] = "application/xml; charset=" + charset;
        response.body = [(typeof xml === 'xml' ? xml.toXMLString() : String(xml))];
        return this;
    };

    /**
     * Set the character encoding used for text responses.
     * @param {string} charsetName the encoding to use.
     * @returns JsgiResponse response with the given charset
     */
    this.charset = function(charsetName) {
        charset = charsetName;
        var ct = response.headers["Content-Type"];
        if (ct) {
            response.headers["Content-Type"] = ct.substring(0, ct.indexOf("; charset=")) +
                "; charset=" + charset;
        }
        return this;
    };

    /**
     * Merge the given object into the headers of the JSGI response.
     * @param {object} headers new header fields to merge with the current ones.
     * @returns JsgiResponse response with the new headers
     */
    this.headers = function(headers) {
        response.headers = merge(headers, response.headers);
        return this;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 200.
     * @returns a JSGI response object to send back
     */
    this.ok = function() {
        response.status = 200;
        return response;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 201.
     * @returns a JSGI response object to send back
     */
    this.created = function() {
        response.status = 201;
        return response;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 400.
     * @returns a JSGI response object to send back
     */
    this.bad = function() {
        response.status = 400;
        return response;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 401.
     * @returns a JSGI response object to send back
     */
    this.unauthorized = function() {
        response.status = 401;
        return response;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 403.
     * @returns a JSGI response object to send back
     */
    this.forbidden = function() {
        response.status = 403;
        return response;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 404.
     * @returns a JSGI response object to send back
     */
    this.notFound = function() {
        response.status = 404;
        return response;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 410.
     * @returns a JSGI response object to send back
     */
    this.gone = function() {
        response.status = 410;
        return response;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 500.
     * @returns a JSGI response object to send back
     */
    this.error = function() {
        response.status = 500;
        return response;
    };

    /**
     * Commits the response and returns a JSGI object with HTTP status 503.
     * @returns a JSGI response object to send back
     */
    this.unavailable = function() {
        response.status = 503;
        return response;
    };

    /**
     * Create a response with HTTP status code 303 that redirects the client
     * to a new location.
     * @param {String} location the new location
     * @returns a JSGI response object to send back
     */
    this.redirect = function(location) {
        return {
            status: 303,
            headers: { Location: location },
            body: ["See other: " + location]
        };
    };

    /**
     * Create a response with HTTP status code 304 that indicates the 
     * document has not been modified
     * @returns a JSGI response object to send back
     */
    this.notModified = function() {
        return {
            status: 304,
            headers: {},
            body: []
        };
    };

    /**
     * Commits the response and returns a JSGI object.
     * @returns a JSGI response object to send back
     */
    this.commit = function() {
        return response;
    };
};


/**
 * Shortcut for JsgiResponse.text()
 * @param {string} text... a variable number of strings to send as response body
 * @returns JsgiResponse response with content-type 'text/plain'
 */
exports.text = function() {
    return (new JsgiResponse()).text(Array.slice(arguments).map(String).join(""));
};

/**
 * Shortcut for JsgiResponse.html()
 * @param {string} html... a variable number of strings to send as response body
 * @returns JsgiResponse response with content-type 'text/html'
 */
exports.html = function() {
    return (new JsgiResponse()).html(Array.slice(arguments).map(String).join(""));
};

/**
 * Shortcut for JsgiResponse.json()
 * @param {object} object the object whose JSON representation to return
 * @returns JsgiResponse response with content-type 'application/json'
 */
exports.json = function(obj) {
    return (new JsgiResponse()).json(obj);
};

/**
 * Shortcut for JsgiResponse.jsonp()
 * @param {string} callback the callback function name for a JSONP request
 * @param {object} object the object whose JSON representation to return
 * @returns JsgiResponse response with content-type 'application/javascript'
 */
exports.jsonp = function(callback, obj) {
    return (new JsgiResponse()).jsonp(callback, obj);
};

/**
 * Shortcut for JsgiResponse.xml()
 * @param {xml|string} xml an XML document
 * @returns JsgiResponse response with content-type 'application/xml'
 */
exports.xml = function(xml) {
    return (new JsgiResponse()).xml(typeof xml === 'xml' ? xml.toXMLString() : String(xml));
};

/**
 * Create a response with HTTP status code 303 that redirects the client
 * to a new location.
 * @param {String} location the new location
 * @returns a JSGI response object to send back
 */
exports.redirect = function (location) {
    return (new JsgiResponse()).redirect(location);
};

/**
 * Create a response with HTTP status code 304 that indicates the 
 * document has not been modified
 * @returns a JSGI response object to send back
 */
exports.notModified = function () {
    return (new JsgiResponse()).notModified();
};

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