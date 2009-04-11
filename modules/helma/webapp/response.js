include('helma/buffer');
import('helma/system', 'system');

export('Response');

// FIXME hack to get this to evaluate
function Response(servletResponse) {

    var writer;
    var status = 200;

    Object.defineProperty(this, 'write', {
        value: function write() {
            writer = writer || servletResponse.getWriter();
            var length = arguments.length;
            for (var i = 0; i < length; i++) {
                writer.write(String(arguments[i]));
                if (i < length - 1)
                    writer.write(' ');
            }
            return this;
        }
    });

    Object.defineProperty(this, 'writeln', {
        value: function writeln() {
            this.write.apply(this, arguments);
            this.write('\r\n');
            return this;
        }
    });


    /**
     * Render a skin to the response's buffer
     * @param skin
     * @param context
     * @param scope
     */
    Object.defineProperty(this, 'render', {
        value: function render(skin, context, scope) {
            var render = require('helma/skin').render;
            this.write(render(skin, context, scope));
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
        value: function(target) {
            servletResponse.sendRedirect(target);
            // fixme: temporary solution until webapp refactoring
            throw {redirect: target};
        }
    });

    Object.defineProperty(this, 'charset', {
        get: function() {
            return servletResponse.getCharacterEncoding();
        },
        set: function(charset) {
            servletResponse.setCharacterEncoding(charset);
        }
    });

    Object.defineProperty(this, 'contentType', {
        get: function() {
            return servletResponse.getContentType();
        },
        set: function(contentType) {
            servletResponse.setContentType(contentType);
        }
    });

    Object.defineProperty(this, 'status', {
        get: function() {
            return status;
        },
        set: function(s) {
            status = s;
            servletResponse.setStatus(s);
        }
    });

}
