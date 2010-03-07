
defineClass(org.ringojs.wrappers.Stream);
/**
 * @constructor
 */
exports.Stream = Stream;

var InputStreamReader = java.io.InputStreamReader,
    BufferedReader = java.io.BufferedReader,
    OutputStreamWriter = java.io.OutputStreamWriter,
    BufferedWriter = java.io.BufferedWriter;

module.shared = true;

Stream.prototype.copy = function(output) {
    while (true) {
         var buffer = this.read();
         if (!buffer.length)
             break;
         output.write(buffer);
    }
    output.flush();
    return this;
};

exports.TextStream = function TextStream(io, charset, buflen) {
    if (this.constructor !== exports.TextStream) {
        return new exports.TextStream(io, charset, buflen);
    }

    var reader, writer;

    if (io.readable()) {
        reader = charset == undefined ?
                 new InputStreamReader(io.inputStream) : 
                 new InputStreamReader(io.inputStream, charset);
        reader = new BufferedReader(reader, buflen || 8192);
    }

    if (io.writable()) {
        writer = charset == undefined ?
                 new OutputStreamWriter(io.outputStream):
                 new OutputStreamWriter(io.outputStream, charset);
        writer = new BufferedWriter(writer, buflen || 8192);
    }

    this.readable = function() {
       return io.readable();
    };

    this.writable = function() {
        return io.writable();
    };

    this.seekable = function() {
        return false;
    };

    this.readLine = function () {
        var line = reader.readLine();
        if (line === null)
            return '';
        return String(line) + "\n";
    };

    this.iterator = function () {
        return this;
    };

    this.next = function () {
        var line = reader.readLine();
        if (line === null)
            throw StopIteration;
        return String(line);
    };

    this.forEach = function (block, context) {
        var line;
        while (true) {
            try {
                line = this.next();
            } catch (exception) {
                break;
            }
            block.call(context, line);
        }
    };

    this.readLines = function () {
        var lines = [];
        do {
            var line = this.readLine();
            if (line.length)
                lines.push(line);
        } while (line.length);
        return lines;
    };

    this.read = function () {
        return this.readLines().join('');
    };

    this.readInto = function (buffer) {
        throw "NYI";
    };

    this.copy = function (output) {
        while (true) {
            var line = this.readLine();
            if (!line.length)
                break;
            output.write(line).flush();
        }
        return this;
    };

    this.write = function () {
        writer.write.apply(writer, arguments);
        return this;
    };

    this.writeLine = function (line) {
        this.write(line + "\n"); // todo recordSeparator
        return this;
    };

    this.writeLines = function (lines) {
        lines.forEach(this.writeLine);
        return this;
    };

    this.print = function () {
        for (var i = 0; i < arguments.length; i++) {
            this.write(String(arguments[i]));
            if (i < arguments.length - 1) {
                this.write(' ');
            }
        }
        this.write('\n');
        this.flush();
        // todo recordSeparator, fieldSeparator
        return this;
    };

    this.flush = function () {
        writer.flush();
        return this;
    };

    this.close = function () {
        io.close();
    };

    return this;
};

/**
 * @name Stream.prototype.write
 * @function
 */

/**
 * @name Stream.prototype.read
 * @function
 */

/**
 * @name Stream.prototype.flush
 * @function
 */

/**
 * @name Stream.prototype.readable
 * @function
 */

/**
 * @name Stream.prototype.seekable
 * @function
 */

/**
 * @name Stream.prototype.writable
 * @function
 */

/**
 * Get the Java input or output stream instance wrapped by this Stream. 
 * @name Stream.prototype.unwrap
 * @function
 */
