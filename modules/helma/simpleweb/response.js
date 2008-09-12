loadModule('helma.app');
var rhino = loadModule('helma.rhino');

rhino.addCallback("onResponse", "debugFlusher", function(res) {
    if (res.status == 200 || res.status >= 400) {
        res.flushDebug();
    }
})

/**
 * Print a debug message to the rendered page.
 */
Response.prototype.debug = function() {
    var buffer = this.getBuffer("debug");
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
    return null;
};

/**
 * Write the debug buffer to the response's main buffer.
 */
Response.prototype.flushDebug = function() {
    var buffer = this.getBuffer("debug");
    this.write(buffer);
    buffer.reset();
    return null;
};





