include('helma/buffer');
import('helma/system', 'system');

// FIXME hack to get this to evaluate
if (!global.Response || !Response.prototype.render) {

    system.addHostObject(org.helma.web.Response);

    /**
     * Render a skin to the response's buffer
     * @param skin
     * @param context
     * @param scope
     */
    Object.defineProperty(Response.prototype, 'render', {
        value: function render(skin, context, scope) {
            var render = require('helma/skin').render;
            this.write(render(skin, context, scope));
        }
    });

    /**
     * Print a debug message to the rendered page.
     */
    Object.defineProperty(Response.prototype, 'debug', {
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
    Object.defineProperty(Response.prototype, 'flushDebug', {
        value: function() {
            if (this.debugBuffer != null) {
                this.write(this.debugBuffer);
                this.debugBuffer.reset();
            }
            return null;
        }
    });

}
