require('core/string');
include('ringo/engine');

export('Buffer');

/**
 * A utility class for composing strings. This is implemented
 * as a simple wrapper around a JavaScript array.
 * @param parts... initial parts to write to the buffer
 */
function Buffer(parts) {
    var content = [];

    /**
     * Reset the buffer discarding all its content.
     */
    this.reset = function() {
        content = [];
        return this;
    };

    /**
     * Append all arguments to this buffer.
     * @param parts... the parts to write to the buffer
     */
    this.write = function(parts) {
        for (var i = 0; i < arguments.length; i++) {
            content[content.length] = String(arguments[i]);
        }
        return this;
    };

    /**
     * Append all arguments to this buffer terminated by a carriage return/newline sequence.
     * @param parts... the parts to write to the buffer
     */
    this.writeln = function(parts) {
        this.write.apply(this, arguments);
        content[content.length] = "\r\n";
        return this;
    };

    /**
     * Return the content of this buffer as string.
     */
    this.toString = function() {
        return content.join('');
    };

    /**
     * Call function <code>fn</code> with each content part in this buffer.
     * @param fn a function to apply to each buffer part
     */
    this.forEach = function(fn) {
        content.forEach(fn);
    };

    /**
     * Get a message digest on the content of this buffer.
     * @param algorithm the algorithm to use, defaults to MD5
     */
    this.digest = function(algorithm) {
        var md = java.security.MessageDigest.getInstance(algorithm || 'MD5');
        content.forEach(function(part) {
            md.update(asJavaString(part).getBytes());
        });
        var b = md.digest();
        var buf = new java.lang.StringBuffer(b.length * 2);
        var j;
        for (var i in b) {
            j = (b[i] < 0) ? (256 + b[i]) : b[i];
            if (j < 16)
                buf.append('0');
            buf.append(java.lang.Integer.toHexString(j));
        }
        return buf.toString();
    };

    if (arguments.length > 0) {
        this.write.apply(this, arguments);
    }

    return this;
}