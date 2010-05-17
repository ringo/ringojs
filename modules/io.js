/**
 * @fileoverview <p>This module implements the Stream/TextStream classes as per
 * the <a href="http://wiki.commonjs.org/wiki/IO/A">CommonJS IO/A</a>
 * proposal.</p>
 */

var {Binary, ByteArray, ByteString} = require("binary");
var {Encoder, Decoder} = require("ringo/encoding");

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
 * In binary stream that reads from and/or writes to an in-memory byte array. If the stream
 * is writable, its internal buffer will automatically on demand.
 * @param {Binary|number} bufferOrCapacity the buffer to use, or the capacity of the buffer
 * to allocate . If this is a number, a ByteArray with the given length is allocated.
 * If this is a ByteArray, the resulting stream is both readable, writable, and seekable.
 * If this is a ByteString, the resulting stream is readable and seekable but not writable.
 * If undefined, a ByteArray of length 1024 is allocated as buffer.
 * @constructor
 */
exports.MemoryStream = function MemoryStream(bufferOrCapacity) {

    var buffer, length;
    if (!bufferOrCapacity) {
        buffer = new ByteArray(0);
        length = 0;
    } else if (bufferOrCapacity instanceof Binary) {
        buffer = bufferOrCapacity;
        length = buffer.length;
    } else if (typeof bufferOrCapacity == "number") {
        buffer = new ByteArray(bufferOrCapacity);
        length = 0;
    } else {
        throw new Error("buffer argument must be Binary or undefined");
    }

    var stream = Object.create(Stream.prototype);
    var position = 0;
    var closed = false;
    var canWrite = buffer instanceof ByteArray;

    function checkClosed() {
        if (closed) {
            throw new Error("Stream has been closed");
        }
    }

    /**
     * @name MemoryStream.instance.readable
     * @function
     */
    stream.readable = function() {
       return true;
    };

    /**
     * @name MemoryStream.instance.writable
     * @function
     */
    stream.writable = function() {
        return buffer instanceof ByteArray;
    };

    /**
     * @name MemoryStream.instance.seekable
     * @function
     */
    stream.seekable = function() {
        return true;
    };

    /**
     * @name MemoryStream.instance.read
     * @function
     */
    stream.read = function(num) {
        checkClosed();
        var result;
        if (isFinite(num)) {
            if (num < 0) {
                throw new Error("read(): argument must not be negative");
            }
            var end = Math.min(position + num, length);
            result = ByteString.wrap(buffer.slice(position, end));
            position = end;
            return result;
        } else {
            result = ByteString.wrap(buffer.slice(position, length));
            position = length;
        }
        return result;
    };

    /**
     * @name MemoryStream.instance.readInto
     * @function
     */
    stream.readInto = function(target, begin, end) {
        checkClosed();
        if (!(target instanceof ByteArray)) {
            throw new Error("readInto(): first argument must be ByteArray");
        }
        if (position >= length) {
            return -1;
        }
        begin = begin === undefined ? 0 : Math.max(0, begin);
        end = end === undefined ? target.length : Math.min(target.length, end);
        if (begin < 0 || end < 0) {
            throw new Error("readInto(): begin and end must not be negative");
        } else if (begin > end) {
            throw new Error("readInto(): end must be greater than begin");
        }
        var count = Math.min(length - position, end - begin);
        buffer.copy(position, position + count, target, begin);
        position += count;
        return count;
    };

    /**
     * @name MemoryStream.instance.write
     * @function
     */
    stream.write = function(source, begin, end) {
        checkClosed();
        if (typeof source === "string") {
            system.stderr.print("Warning: binary write called with string argument. Using default encoding");
            source = source.toByteString();
        }
        if (!(source instanceof Binary)) {
            throw new Error("write(): first argument must be binary");
        }
        begin = begin === undefined ? 0 : Math.max(0, begin);
        end = end === undefined ? source.length : Math.min(source.length, end);
        if (begin > end) {
            throw new Error("write(): end must be greater than begin");
        }
        var count = end - begin;
        source.copy(begin, end, buffer, position);
        position += count;
        length = Math.max(length, position);
    };

    /**
     * @name MemoryStream.instance.content
     */
    Object.defineProperty(stream, "content", {
        get: function() {
            return buffer;
        }
    });

    /**
     * @name MemoryStream.instance.length
     */
    Object.defineProperty(stream, "length", {
        get: function() {
            checkClosed();
            return length
        },
        set: function(value) {
            if (canWrite) {
                checkClosed();
                length = buffer.length = value;
                position = Math.min(position, length);
            }
        }
    });

    /**
     * @name MemoryStream.instance.position
     */
    Object.defineProperty(stream, "position", {
        get: function() {
            checkClosed();
            return position;
        },
        set: function(value) {
            checkClosed();
            position = Math.min(Math.max(0, value), length);
        }
    });

    /**
     * @name MemoryStream.instance.skip
     * @function
     */
    stream.skip = function(num) {
        checkClosed();
        num = Math.min(parseInt(num, 10), length - position);
        if (isNaN(num)) {
            throw new Error("skip() requires a number argument");
        } else if (num < 0) {
            throw new Error("Argument to skip() must not be negative");
        }
        position += num;
        return num
    };

    /**
     * @name MemoryStream.instance.flush
     * @function
     */
    stream.flush = function() {
        checkClosed();
    };

    /**
     * Closes the stream, freeing the resources it is holding.
     * @name MemoryStream.instance.close
     * @function
     */
    stream.close = function() {
        checkClosed();
        closed = true;
    };

    /**
     * Returns true if the stream is closed, false otherwise.
     * @name MemoryStream.instance.closed
     * @function
     */
    stream.closed = function() {
        return closed;
    };

    return stream;
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

    charset = charset || "utf8";
    var reader, writer;
    var encoder, decoder;
    var DEFAULTSIZE = 8192;

    if (io.readable()) {
        decoder = new Decoder(charset, false, buflen || DEFAULTSIZE);
        decoder.readFrom(io);
    }

    if (io.writable()) {
        encoder = new Encoder(charset, false, buflen || DEFAULTSIZE);
        encoder.writeTo(io);
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
        var line = decoder.readLine(true);
        if (line === null)
            return "";
        return String(line);
    };

    /**
     * Returns this stream (which also is an Iterator).
     * @function
     */
    this.iterator = this.__iterator__ = function () {
        return this;
    };

    /**
     * Returns the next line of input without the newline. Throws
     * `StopIteration` if the end of the stream is reached.
     */
    this.next = function () {
        var line = decoder.readLine(false);
        if (line == null) {
            throw StopIteration;
        }
        return String(line);
    };

    this.forEach = function (callback, thisObj) {
        for (var line in this) {
            callback.call(thisObj, line);
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
        return decoder.read();
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
        for (var i = 0; i < arguments.length; i++) {
            encoder.encode(String(arguments[i]));
        }
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
        io.flush();
        return this;
    };

    /** See `Stream.prototype.close`. */
    this.close = function () {
        io.close();
    };

    Object.defineProperty(this, "content", {
        get: function() {
            var wrappedContent = io.content;
            if (!wrappedContent) {
                return "";
            }
            return wrappedContent.decodeToString(charset);
        }
    });

    Object.defineProperty(this, "raw", {
        get: function() {
            return io;
        }
    });

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
 * Try to skip over num bytes in the stream. Returns the number of acutal bytes skipped
 * or throws an error if the operation could not be completed.
 * @name Stream.prototype.skip
 * @param {Number} num bytes to skip
 * @returns {Number} actual bytes skipped
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
 * Returns true if the stream has been closed, false otherwise.
 * @name Stream.prototype.closed
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
