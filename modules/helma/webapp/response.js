var system = require('helma.system');
system.addHostObject(org.helma.web.Response);

system.addCallback("onResponse", "debugFlusher", function(res) {
    if (res.status == 200 || res.status >= 400) {
        res.flushDebug();
    }
})

/**
 * Render a skin to the response's buffer
 * @param skin
 * @param context
 * @param scope
 */
Response.prototype.render = function(skin, context, scope) {
    var render = require('helma.skin').render;
    this.write(render(skin, context, scope));
}

/**
 * Print a debug message to the rendered page.
 */
Response.prototype.debug = function() {
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
};

/**
 * Write the debug buffer to the response's main buffer.
 */
Response.prototype.flushDebug = function() {
    if (this.debugBuffer != null) {
        this.write(this.debugBuffer);
        this.debugBuffer.reset();
    }
    return null;
};
