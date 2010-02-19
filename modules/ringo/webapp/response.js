include('binary');
include('io');
include('ringo/buffer');
include('./util');
include('./mime');

export('Response',
       'SkinnedResponse',
       'JSONResponse',
       'RedirectResponse',
       'StaticResponse',
       'NotFoundResponse');

module.shared = true;

function Response() {

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
 *
 * @param skin
 * @param context
 * @param scope
 * @constructor
 */
function SkinnedResponse(skin, context, scope) {
    var render = require('ringo/skin').render;
    return new Response(render(skin, context, scope));
}

/**
 *
 * @param object
 * @constructor
 */
function JSONResponse(object) {
    var res = new Response(JSON.stringify(object));
    res.contentType = 'application/json';
    return res;
}

/**
 * @param resource
 * @constructor
 */
function StaticResponse(resource) {
    if (typeof resource == 'string') {
        resource = getResource(resource);
    }
    if (!(resource instanceof org.ringo.repository.Resource)) {
        throw Error("Wrong argument for StaticResponse: " + typeof(resource));
    }
    if (!resource.exists()) {
        return new NotFoundResponse(String(resource));
    }
    var contentType = mimeType(resource.name);
    var input = new IOStream(resource.getInputStream());
    var bufsize = 8192;
    var buffer = new ByteArray(bufsize);
    return {
        status: 200,
        headers: {
            'Content-Type': contentType
        },
        body: {
            digest: function() {
                return resource.lastModified().toString(36) 
                    + resource.length.toString(36);
            },
            forEach: function(block) {
                var read;
                while ((read = input.readInto(buffer)) > -1) {
                    buffer.length = read;
                    block(buffer);
                    buffer.length = bufsize;
                }
            }
        }
    };
}

/**
 *
 * @param location
 * @constructor
 */
function RedirectResponse(location) {
    return {
        status: 303,
        headers: {Location: location},
        body: ["See other: " + location]
    };
}

/**
 *
 * @param location
 * @constructor
 */
function NotFoundResponse(location) {
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
