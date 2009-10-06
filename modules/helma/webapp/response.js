include('helma/buffer');
include('helma/webapp/util');

export('Response', 'SkinnedResponse', 'JSONResponse', 'RedirectResponse', 'StaticResponse');

module.shared = true;

function Response() {

    var config = require('helma/webapp/env').config;
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
    }

    this.write.apply(this, arguments);

    this.writeln = function writeln() {
        this.write.apply(this, arguments);
        buffer.write('\r\n');
        return this;
    }


    /**
     * Render a skin to the response's buffer
     * @param skin path to skin resource
     * @param context context object
     * @param scope optional scope for relative resource paths
     */
    this.render = function render(skin, context, scope) {
        var render = require('helma/skin').render;
        buffer.write(render(skin, context, scope));
    }

    /**
     * Print a debug message to the rendered page.
     */
    this.debug =  function debug() {
        var buffer = this.debugBuffer || new Buffer();
        buffer.write("<div class=\"helma-debug-line\" style=\"background: yellow;");
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
    }

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
    }

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
    }

    this.setHeader = function(key, value) {
        key = String(key);
        if (key.toLowerCase() == "content-type") {
            contentType = String(value);
            charset = getMimeParameter(contentType, "charset") || charset;
        }
        headers.set(String(key), String(value));
    }

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
    }

}

function SkinnedResponse(skin, context, scope) {
    var render = require('helma/skin').render;
    return new Response(render(skin, context, scope));
}

function JSONResponse(object) {
    var JSON = require('core/json').JSON;
    var res = new Response(JSON.stringify(object));
    res.contentType = 'application/json';
    return res;
}

function StaticResponse(resource) {
    if (typeof resource == 'string') {
        resource = getResource(resource);
    }
    if (!(resource instanceof org.helma.repository.Resource)) {
        throw Error("Wrong argument for StaticResponse: " + typeof(resource));
    }
    require('binary');
    var contentType = require('./mime').mimeType(resource.name);
    var content = resource.content.toByteString("utf-8");
    return {
        status: 200,
        headers: {'Content-Type': contentType},
        body: {
            digest: resource.digest,
            forEach: function(block) {
                // FIXME
                block(content);
            }
        }
    };
}

function RedirectResponse(location) {
    return {
        status: 303,
        headers: {Location: location},
        body: ["See other: " + location]
    };
}
