require('core/string');
include('helma/system');

export('Buffer');

/**
 * A utility class for composing strings. This is implemented
 * as a simple wrapper around a JavaScript array.
 */
function Buffer() {
    var content = [];

    this.reset = function() {
        content = [];
        return this;
    }

    this.write = function() {
        for (var i = 0; i < arguments.length; i++) {
            content[content.length] = String(arguments[i]);
        }
        return this;
    };

    this.writeln = function() {
        this.write.apply(this, arguments);
        content[content.length] = "\r\n";
        return this;
    };

    this.toString = function() {
        return content.join('');
    };

    this.forEach = function(fn) {
        content.forEach(fn);
    }

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
    }

    if (arguments.length > 0) {
        this.write.apply(this, arguments);
    }

    return this;
}