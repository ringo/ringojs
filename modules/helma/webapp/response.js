include('hashp');
include('helma/buffer');
import('helma/system', 'system');

export('Response', 'SkinnedResponse', 'RedirectResponse' /*, 'NotFoundResponse', 'ServerErrorResponse'*/);

function Response() {

    var status = 200;
    var charset;
    var contentType;
    var headers = {};
    var buffer = new Buffer();

    Object.defineProperty(this, 'write', {
        value: function write() {
            var length = arguments.length;
            for (var i = 0; i < length; i++) {
                buffer.write(String(arguments[i]));
                if (i < length - 1)
                    buffer.write(' ');
            }
            return this;
        }
    });

    this.write.apply(this, arguments);

    Object.defineProperty(this, 'writeln', {
        value: function writeln() {
            this.write.apply(this, arguments);
            buffer.write('\r\n');
            return this;
        }
    });


    /**
     * Render a skin to the response's buffer
     * @param skin path to skin resource
     * @param context context object
     * @param scope optional scope for relative resource paths
     */
    Object.defineProperty(this, 'render', {
        value: function render(skin, context, scope) {
            var render = require('helma/skin').render;
            buffer.write(render(skin, context, scope));
        }
    });

    /**
     * Print a debug message to the rendered page.
     */
    Object.defineProperty(this, 'debug', {
        value: function debug() {
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
    });

    /**
     * Write the debug buffer to the response's main buffer.
     */
    Object.defineProperty(this, 'flushDebug', {
        value: function() {
            if (this.debugBuffer != null) {
                this.write(this.debugBuffer);
                this.debugBuffer.reset();
            }
            return null;
        }
    });

    Object.defineProperty(this, 'redirect', {
        value: function(location) {
            status = 303;
            HashP.set(headers, 'Location', String(location));
        }
    });

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

    Object.defineProperty(this, 'getHeader', {
        value: function(key) {
            HashP.get(headers, String(key));
        }
    });

    Object.defineProperty(this, 'setHeader', {
        value: function(key, value) {
            HashP.set(headers, String(key), String(value));
        }
    });

    Object.defineProperty(this, 'close', {
        value: function() {
            if (charset) {
                contentType = contentType || HashP.get('content-type') || "text/html";
                contentType += "; charset=" + charset;
            }
            if (contentType) {
                HashP.set(headers, "Content-Type", contentType);
            }
            return [status, headers, buffer];
        }
    })

}

function SkinnedResponse(skin, context, scope) {
    var render = require('helma/skin').render;
    return [200, {}, render(skin, context, scope)];
}

function RedirectResponse(location) {
    return [303, {Location: location}, "See other: " + location];
}
