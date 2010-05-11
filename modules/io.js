/**
 * @fileoverview <p>This module implements the Stream/TextStream classes as per
 * the <a href="http://wiki.commonjs.org/wiki/IO/A">CommonJS IO/A</a>
 * proposal.</p>
 */

var ByteArray = require("binary").ByteArray;

defineClass(org.ringojs.wrappers.Stream);

/**
 * This class implements an I/O stream used to read and write raw bytes.
 * @constructor
 */
exports.Stream = Stream;

/** @ignore Narwhal compatibility */
exports.IO = Stream;

var InputStreamReader = java.io.InputStreamReader,
    BufferedReader = java.io.BufferedReader,
    OutputStreamWriter = java.io.OutputStreamWriter,
    BufferedWriter = java.io.BufferedWriter;

module.shared = true;

/**
 * Reads from all data available from this stream and writes the result to the
 * given output stream, flushing afterwards.
 * @param {Stream} output The target Stream to be written to.
 */
Stream.prototype.copy = function(output) {
    var length = 8192;
    var buffer = new ByteArray(length);
    while (true) {
        var read = this.readInto(buffer, 0, length);
        if (read < 0)
            break;
        output.write(buffer, 0, read);
    }
    output.flush();
    return this;
};

/**
 * A TextStream implements an I/O stream used to read and write strings. It
 * wraps a raw Stream and exposes a similar interface.
 * @param {Stream} io The raw Stream to be wrapped.
 * @param charset
 * @param buflen
 * @constructor
 */
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
                 new OutputStreamWriter(io.outputStream) :
                 new OutputStreamWriter(io.outputStream, charset);
        writer = new BufferedWriter(writer, buflen || 8192);
    }

    /** See `Stream.prototype.readable`. */
    this.readable = function() {
       return io.readable();
    };

    /** See `Stream.prototype.writable`. */
    this.writable = function() {
        return io.writable();
    };

    /**
     * Always returns false, as a TextStream is not randomly accessible.
     */
    this.seekable = function() {
        return false;
    };

    /**
     * Reads a line from this stream. If the end of the stream is reached
     * before any data is gathered, returns an empty string. Otherwise, returns
     * the line including the newline.
     * @returns {String}
     */
    this.readLine = function () {
        var line = reader.readLine();
        if (line === null)
            return '';
        return String(line) + "\n";
    };

    /**
     * Returns this stream (which also is an Iterator).
     */
    this.iterator = function () {
        return this;
    };

    /**
     * Returns the next line of input without the newline. Throws
     * `StopIteration` if the end of the stream is reached.
     */
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

    /**
     * Returns an Array of Strings, accumulated by calling `readLine` until it
     * returns an empty string. The returned array does not include the final
     * empty string, but it does include a trailing newline at the end of every
     * line.
     */
    this.readLines = function () {
        var lines = [];
        do {
            var line = this.readLine();
            if (line.length)
                lines.push(line);
        } while (line.length);
        return lines;
    };

    /**
     * Read the full stream until the end is reached and return the data read
     * as string.
     * @returns {String}
     */
    this.read = function () {
        return this.readLines().join('');
    };

    /**
     * Not implemented for TextStraim. Calling this method will raise an error.
     */
    this.readInto = function (buffer) {
        throw new Error("Not implemented");
    };

    /**
     * Reads from this stream with `readLine`, writing the results to the
     * target stream and flushing, until the end of this stream is reached.
     */
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

    /**
     * Writes the given line, followed by a newline.
     */
    this.writeLine = function (line) {
        this.write(line + "\n"); // todo recordSeparator
        return this;
    };

    /**
     * Writens the given lines, terminating each line with a newline.
     *
     * This is a non-standard extension, not part of CommonJS IO/A.
     */
    this.writeLines = function (lines) {
        lines.forEach(this.writeLine);
        return this;
    };

    /**
     * Writes all argument values as a single line, delimiting the values using
     * a single blank.
     */
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

    /** See `Stream.prototype.flush`. */
    this.flush = function () {
        writer.flush();
        return this;
    };

    /** See `Stream.prototype.close`. */
    this.close = function () {
        io.close();
    };

    return this;
};

/**
 * Write bytes from b to this stream. If begin and end are specified, only the
 * range starting at begin and ending before end is written.
 * @name Stream.prototype.write
 * @param {Binary} b The source to be written from
 * @param {Number} begin optional
 * @param {Number} end optional
 * @function
 */

/**
 * Read up to n bytes from the stream, or until the end of the stream has been
 * reached. If n is null, a block is read with a block-size specific to the
 * underlying device. If n is not specified, the full stream is read until its
 * end is reached. Reading from a stream where the end has been reached returns
 * an empty ByteString.
 * @name Stream.prototype.read
 * @param {Number} n
 * @returns {ByteString}
 * @function
 */

/**
 * Read bytes from this stream into the given buffer. This method does
 * <i>not</i> increase the length of the buffer.
 * @name Stream.prototype.readInto
 * @param {ByteArray} buffer
 * @param {Number} begin
 * @param {Number} end
 * @returns {Number} The number of bytes read or -1 if the end of the stream
 *          has been reached
 * @function
 */

/**
 * Flushes the bytes written to the stream to the underlying medium.
 * @name Stream.prototype.flush
 * @function
 */

/**
 * Closes the stream, freeing the resources it is holding.
 * @name Stream.prototype.close
 * @function
 */

/**
 * Returns true if the stream supports reading, false otherwise.
 * @name Stream.prototype.readable
 * @function
 */

/**
 * Returns true if the stream is randomly accessible and supports the length
 * and position properties, false otherwise.
 * @name Stream.prototype.seekable
 * @function
 */

/**
 * Returns true if the stream supports writing, false otherwise.
 * @name Stream.prototype.writable
 * @function
 */

/**
 * Get the Java input or output stream instance wrapped by this Stream.
 * @name Stream.prototype.unwrap
 * @function
 */

/**
 * @name Stream.prototype.inputStream
 * @property
 * @type java.io.InputStream
 */

/**
 * @name Stream.prototype.outputStream
 * @property
 * @type java.io.OutputStream
 */
