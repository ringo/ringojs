include('core/json2');

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
            content[content.length] = arguments[i];
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

    if (arguments.length > 0) {
        this.write.apply(this, arguments);
    }

    return this;
}