include('binary');
include('io');
include('ringo/buffer');
include('./util');
include('./mime');

export('Response',
       'skinResponse',
       'jsonResponse',
       'xmlResponse',
       'staticResponse',
       'redirectResponse',
       'notFoundResponse',
       'errorResponse');

module.shared = true;

function Response() {

    // missing new security belt
    if (!(this instanceof Response)) {
        var response = new Response();
        response.write.apply(response, arguments);
        return response;
    }

    var config = require('ringo/webapp/env').config;
    var status = 200;
    var charset = config && config.charset || 'utf-8';
    var contentType = config && config.contentType || 'text/html';
    var headers = new Headers();
    var buffer = new Buffer();

    this.write = function write() {
        var length = arguments.length;
        for (var i = 0; i < length; i++) {
            buffer.write(String(arguments[i]));
            if (i < length - 1)
                buffer.write(' ');
        }
        return this;
    };

    this.write.apply(this, arguments);

    this.writeln = function writeln() {
        this.write.apply(this, arguments);
        buffer.write('\r\n');
        return this;
    };


    /**
     * Render a skin to the response's buffer
     * @param skin path to skin resource
     * @param context context object
     */
    this.render = function render(skin, context) {
        var render = require('ringo/skin').render;
        buffer.write(render(skin, context));
    };

    /**
     * Print a debug message to the rendered page.
     */
    this.debug =  function debug() {
        var buffer = this.debugBuffer || new Buffer();
        buffer.write("<div class=\"ringo-debug-line\" style=\"background: yellow;");
        buffer.write("color: black; border-top: 1px solid black;\">");
        var length = arguments.length;
        for (var i = 0; i < length; i++) {
            buffer.write(arguments[i]);
            if (i < length - 1) {
                buffer.write(" ");
            }
        }
        buffer.writeln("</div>");
        this.debugBuffer = buffer;
        return null;
    };

    /**
     * Write the debug buffer to the response's main buffer.
     */
    this.flushDebug = function() {
        if (this.debugBuffer != null) {
            this.write(this.debugBuffer);
            this.debugBuffer.reset();
        }
        return null;
    };

    this.redirect = function(location) {
        status = 303;
        headers.set('Location', String(location));
    };

    Object.defineProperty(this, 'charset', {
        get: function() {
            return charset;
        },
        set: function(c) {
            charset = c;
        }
    });

    Object.defineProperty(this, 'contentType', {
        get: function() {
            return contentType;
        },
        set: function(c) {
            contentType = c;
        }
    });

    Object.defineProperty(this, 'status', {
        get: function() {
            return status;
        },
        set: function(s) {
            status = s;
        }
    });

    this.getHeader = function(key) {
        headers.get(String(key));
    };

    this.setHeader = function(key, value) {
        key = String(key);
        if (key.toLowerCase() == "content-type") {
            contentType = String(value);
            charset = getMimeParameter(contentType, "charset") || charset;
        }
        headers.set(String(key), String(value));
    };

    this.close = function() {
        this.flushDebug();
        if (contentType && !headers.contains('content-type')) {
            if (charset) {
                contentType += "; charset=" + charset;
            }
            headers.set("Content-Type", contentType);
        }
        return {
            status: status,
            headers: headers,
            body: buffer
        };
    };

}

/**
 * A response object rendered from a skin.
 * @param {Resource|String} skin the skin resource or path.
 * @param {Object} context the skin context object
 */
function skinResponse(skin, context) {
    if (!(skin instanceof org.ringojs.repository.Resource)) {
        skin = this.getResource(skin);
    }
    var render = require('ringo/skin').render;
    return new Response(render(skin, context));
}

/**
 * Create a response object containing the JSON representation of an object.
 * @param {Object} object the object whose JSON representation to return
 */
function jsonResponse(object) {
    var res = new Response(JSON.stringify(object));
    res.contentType = 'application/json';
    return res;
}

/**
 * Create a response containing the given XML document
 * @param {XML|String} xml an XML document
 */
function xmlResponse(xml) {
    var res = new Response(typeof xml === 'xml' ? xml.toXMLString() : xml);
    res.contentType = 'application/xml';
    return res;
}

/**
 * A response representing a static resource.
 * @param {String|Resource} resource the resource to serve
 * @param {String} contentType optional MIME type. If not defined,
 *         the MIME type is detected from the file name extension.
 */
function staticResponse(resource, contentType) {
    if (typeof resource == 'string') {
        resource = getResource(resource);
    }
    if (!(resource instanceof org.ringojs.repository.Resource)) {
        throw Error("Wrong argument for staticResponse: " + typeof(resource));
    }
    if (!resource.exists()) {
        return notFoundResponse(String(resource));
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
}

/**
 * Create a response that redirects the client to a different URL.
 * @param {String} location the new location
 */
function redirectResponse(location) {
    return {
        status: 303,
        headers: {Location: location},
        body: ["See other: " + location]
    };
}

/**
 * Create a 404 not-found response.
 * @param {String} location the location that couldn't be found
 */
function notFoundResponse(location) {
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
}

/**
 * Create a 500 error response.
 * @param {String} msg the message of response body
 */
function errorResponse(msg) {
    return {
        status: 500,
        headers: {'Content-Type': 'text/plain'},
        body: [typeof msg === 'undefined' ? 'Something went wrong.' :
                String(msg)]
    };
}
