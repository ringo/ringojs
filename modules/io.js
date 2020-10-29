/**
 * @fileoverview This module provides functions for reading and writing streams of raw bytes.
 * It implements the <code>Stream</code> and <code>TextStream</code> classes as per
 * the <a href="http://wiki.commonjs.org/wiki/IO/A">CommonJS IO/A</a> proposal.
 *
 * Streams are closely related with two other modules. Low-level byte manipulation is provided
 * by the <a href="../binary/index.html"><code>binary</code></a> module
 * and uses the <code>ByteArray</code> or <code>ByteString</code> class. The
 * <a href="../fs/index.html"><code>fs</code></a> module returns <code>io</code> streams for reading and
 * writing files.
 */

const {Encoder, Decoder} = require("ringo/encoding");

defineClass(org.ringojs.wrappers.Stream);

/**
 * This class implements an I/O stream used to read and write raw bytes.
 * @constructor
 */
exports.Stream = Stream;

/**
 * Reads all data available from this stream and writes the result to the
 * given output stream, flushing afterwards. Note that this function does
 * not close this stream or the output stream after copying.
 * @param {Stream} output The target Stream to be written to.
 */
Stream.prototype.copy = function(output) {
    const length = 8192;
    const buffer = new ByteArray(length);
    let read = -1;
    while ((read = this.readInto(buffer, 0, length)) > -1) {
        output.write(buffer, 0, read);
    }
    output.flush();
    return this;
};

/**
 * Read all data from this stream and invoke function `fn` for each chunk of data read.
 * The callback function is called with a ByteArray as single argument. Note that
 * the stream is not closed after reading.
 * @param {Function} fn the callback function
 * @param {Object} [thisObj] optional this-object to use for callback
 */
Stream.prototype.forEach = function(fn, thisObj) {
    const length = 8192;
    const buffer = new ByteArray(length);
    let read = -1;
    while ((read = this.readInto(buffer, 0, length)) > -1) {
        buffer.length = read;
        fn.call(thisObj, buffer);
        buffer.length = length;
    }
};

/**
 * A binary stream that reads from and/or writes to an in-memory byte array.
 *
 * If the constructor is called with a Number argument, a ByteArray with the
 * given length is allocated and the length of the stream is set to zero.
 *
 * If the argument is a [binary object](../binary) it will be used as underlying
 * buffer and the stream length set to the length of the binary object.
 * If argument is a [ByteArray](../binary#ByteArray), the resulting stream is both
 * readable, writable, and seekable. If it is a [ByteString](../binary#ByteString),
 * the resulting stream is readable and seekable but not writable.
 *
 * If called without argument, a ByteArray of length 1024 is allocated as buffer.
 *
 * @param {Binary|Number} binaryOrNumber the buffer to use, or the initial
 * capacity of the buffer to allocate.
 * @constructor
 */
exports.MemoryStream = function MemoryStream(binaryOrNumber) {
    let buffer, length;
    if (!binaryOrNumber) {
        buffer = new ByteArray(0);
        length = 0;
    } else if (binaryOrNumber instanceof Binary) {
        buffer = binaryOrNumber;
        length = buffer.length;
    } else if (typeof binaryOrNumber == "number") {
        buffer = new ByteArray(binaryOrNumber);
        length = 0;
    } else {
        throw new Error("Argument must be Binary, Number, or undefined");
    }

    const stream = Object.create(Stream.prototype);
    const canWrite = buffer instanceof ByteArray;
    let position = 0;
    let closed = false;

    function checkClosed() {
        if (closed) {
            throw new Error("Stream has been closed");
        }
    }

    /**
     * Returns true if the stream supports reading, false otherwise.
     * Always returns true for MemoryStreams.
     * @name MemoryStream.prototype.readable
     * @see #Stream.prototype.readable
     * @return {Boolean} true if stream is readable
     * @function
     */
    stream.readable = function() {
       return true;
    };

    /**
     * Returns true if the stream supports writing, false otherwise.
     * For MemoryStreams this returns true if the wrapped binary is an
     * instance of ByteArray.
     * @name MemoryStream.prototype.writable
     * @see #Stream.prototype.writable
     * @return {Boolean} true if stream is writable
     * @function
     */
    stream.writable = function() {
        return buffer instanceof ByteArray;
    };

    /**
     * Returns true if the stream is randomly accessible and supports the length
     * and position properties, false otherwise.
     * Always returns true for MemoryStreams.
     * @name MemoryStream.prototype.seekable
     * @see #Stream.prototype.seekable
     * @return {Boolean} true if stream is seekable
     * @function
     */
    stream.seekable = function() {
        return true;
    };

    /**
     * Read up to `maxBytes` bytes from the stream, or until the end of the stream
     * has been reached. If `maxBytes` is not specified, the full stream is read
     * until its end is reached. Reading from a stream where the end has already been
     * reached returns an empty ByteString.
     * @name MemoryStream.prototype.read
     * @param {Number} maxBytes the maximum number of bytes to read
     * @returns {ByteString}
     * @see #Stream.prototype.read
     * @function
     */
    stream.read = function(maxBytes) {
        checkClosed();
        let result;
        if (isFinite(maxBytes)) {
            if (maxBytes < 0) {
                throw new Error("read(): argument must not be negative");
            }
            const end = Math.min(position + maxBytes, length);
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
     * Read bytes from this stream into the given buffer. This method does
     * *not* increase the length of the buffer.
     * @name MemoryStream.prototype.readInto
     * @param {ByteArray} buffer the buffer
     * @param {Number} begin optional begin index, defaults to 0.
     * @param {Number} end optional end index, defaults to buffer.length - 1.
     * @returns {Number} The number of bytes read or -1 if the end of the stream
     *          has been reached
     * @see #Stream.prototype.readInto
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
        const count = Math.min(length - position, end - begin);
        buffer.copy(position, position + count, target, begin);
        position += count;
        return count;
    };

    /**
     * Write bytes from b to this stream. If begin and end are specified,
     * only the range starting at begin and ending before end is written.
     * @name MemoryStream.prototype.write
     * @param {Binary} source The source to be written from
     * @param {Number} begin optional
     * @param {Number} end optional
     * @see #Stream.prototype.write
     * @function
     */
    stream.write = function(source, begin, end) {
        checkClosed();
        if (typeof source === "string") {
            require("system").stderr.print("Warning: binary write called with string argument. "
                    + "Using default encoding");
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
        const count = end - begin;
        source.copy(begin, end, buffer, position);
        position += count;
        length = Math.max(length, position);
    };

    /**
     * The wrapped buffer.
     * @name MemoryStream.prototype.content
     */
    Object.defineProperty(stream, "content", {
        get: function() {
            return buffer;
        }
    });

    /**
     * The number of bytes in the stream's underlying buffer.
     * @name MemoryStream.prototype.length
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
     * The current position of this stream in the wrapped buffer.
     * @name MemoryStream.prototype.position
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
     * Try to skip over num bytes in the stream. Returns the number of acutal bytes skipped
     * or throws an error if the operation could not be completed.
     * @name Stream.prototype.skip
     * @param {Number} num bytes to skip
     * @returns {Number} actual bytes skipped
     * @name MemoryStream.prototype.skip
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
     * Flushes the bytes written to the stream to the underlying medium.
     * @name MemoryStream.prototype.flush
     * @function
     */
    stream.flush = function() {
        checkClosed();
    };

    /**
     * Closes the stream, freeing the resources it is holding.
     * @name MemoryStream.prototype.close
     * @function
     */
    stream.close = function() {
        checkClosed();
        closed = true;
    };

    /**
     * Returns true if the stream is closed, false otherwise.
     * @name MemoryStream.prototype.closed
     * @return {Boolean} true if the stream has been closed
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
 * @param {Object} options the options object. Supports the following properties:
 *        <ul><li>charset: string containing the name of the encoding to use.
 *            Defaults to "utf8".</li>
 *        <li>newline: string containing the newline character sequence to use in
 *            writeLine() and writeLines(). Defaults to "\n".</li>
 *        <li>delimiter: string containing the delimiter to use in print().
 *            Defaults to " ".</li></ul>
 * @param {Number} buflen optional buffer size. Defaults to 8192.
 * @constructor
 */
exports.TextStream = function TextStream(io, options, buflen) {
    if (this.constructor !== exports.TextStream) {
        return new exports.TextStream(io, options, buflen);
    }

    options = options || {};
    const charset = options.charset || "utf8";
    const newline = options.hasOwnProperty("newline") ? options.newline : "\n";
    const delimiter = options.hasOwnProperty("delimiter") ? options.delimiter : " ";
    const DEFAULTSIZE = 8192;

    let encoder, decoder;
    if (io.readable()) {
        decoder = new Decoder(charset, false, buflen || DEFAULTSIZE);
        decoder.readFrom(io);
    }

    if (io.writable()) {
        encoder = new Encoder(charset, false, buflen || DEFAULTSIZE);
        encoder.writeTo(io);
    }

    /**
     * @see #Stream.prototype.readable
     */
    this.readable = function() {
       return io.readable();
    };

    /**
     * @see #Stream.prototype.writable
     */
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
     * the line including only the newline character. Carriage return will be dropped.
     * @returns {String} the next line
     */
    this.readLine = function () {
        const line = decoder.readLine(true);
        if (line === null)
            return "";
        return String(line);
    };

    /**
     * Returns this stream.
     * @return {TextStream} this stream
     */
    this.iterator = function () {
        return this;
    };

    /**
     * Returns the next line of input without the newline. Throws
     * `StopIteration` if the end of the stream is reached.
     * @returns {String} the next line
     * @example const fs = require('fs');
     * const txtStream = fs.open('./browserStats.csv', 'r');
     * try {
     *   while (true) {
     *      console.log(txtStream.next());
     *   }
     * } catch (e) {
     *   console.log("EOF");
     * }
     */
    this.next = function () {
        const line = decoder.readLine(false);
        if (line == null) {
            throw StopIteration;
        }
        return String(line);
    };

    /**
     * Calls `callback` with each line in the input stream.
     * @param {Function} callback the callback function
     * @param {Object} [thisObj] optional this-object to use for callback
     * @example const txtStream = fs.open('./browserStats.csv', 'r');
     * txtStream.forEach(function(line) {
     *   console.log(line); // Print one single line
     * });
     */
    this.forEach = function (callback, thisObj) {
        let line = decoder.readLine(false);
        while (line != null) {
            callback.call(thisObj, line);
            line = decoder.readLine(false);
        }
    };

    /**
     * Returns an Array of Strings, accumulated by calling `readLine` until it
     * returns an empty string. The returned array does not include the final
     * empty string, but it does include a trailing newline at the end of every
     * line.
     * @returns {Array} an array of lines
     * @example >> const fs = require('fs');
     * >> const txtStream = fs.open('./sampleData.csv', 'r');
     * >> const lines = txtStream.readLines();
     * >> console.log(lines.length + ' lines');
     * 6628 lines
     */
    this.readLines = function () {
        const lines = [];
        let line;
        do {
            line = this.readLine();
            if (line.length) {
                lines.push(line);
            }
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
     * Not implemented for `TextStream`. Calling this method will raise an error.
     */
    this.readInto = function () {
        throw new Error("Not implemented");
    };

    /**
     * Reads from this stream with [readLine](#readLine), writing the results
     * to the target stream and flushing, until the end of this stream is reached.
     * @param {Stream} output
     * @return {TextStream} this stream
     */
    this.copy = function (output) {
        while (true) {
            let line = this.readLine();
            if (!line.length) {
                break;
            }
            output.write(line).flush();
        }
        return this;
    };

    /**
     * Writes all arguments to the stream.
     * @return {TextStream} this stream
     * @example >> const fs = require('fs');
     * >> const txtOutStream = fs.open('./demo.txt', 'w');
     * >> txtOutStream.write('foo', 'bar', 'baz');
     *
     * // demo.txt content:
     * foobarbaz
     */
    this.write = function () {
        if (!io.writable()) {
            throw new Error("The TextStream is not writable!");
        }

        for (let i = 0; i < arguments.length; i++) {
            encoder.encode(String(arguments[i]));
        }
        return this;
    };

    /**
     * Writes the given line to the stream, followed by a newline.
     * @param {String} line
     * @return {TextStream} this stream
     */
    this.writeLine = function (line) {
        this.write(line + newline);
        return this;
    };

    /**
     * Writes the given lines to the stream, terminating each line with a newline.
     * This is a non-standard extension, not part of CommonJS IO/A.
     *
     * @param {Array} lines
     * @return {TextStream} this stream
     */
    this.writeLines = function (lines) {
        lines.forEach(this.writeLine, this);
        return this;
    };

    /**
     * Writes all argument values as a single line, delimiting the values using
     * a single blank.
     * @example >> const fs = require('fs');
     * >> const txtOutStream = fs.open('./demo.txt', 'w');
     * >> txtOutStream.print('foo', 'bar', 'baz');
     *
     * // demo.txt content:
     * foo bar baz
     * @return {TextStream} this stream
     */
    this.print = function () {
        for (let i = 0; i < arguments.length; i++) {
            this.write(String(arguments[i]));
            if (i < arguments.length - 1) {
                this.write(delimiter);
            }
        }
        this.write(newline);
        this.flush();
        return this;
    };

    /**
     * @see #Stream.prototype.flush
     */
    this.flush = function () {
        io.flush();
        return this;
    };

    /**
     * @see #Stream.prototype.close
     */
    this.close = function () {
        io.close();
    };

    /**
     * If the wrapped stream is a [MemoryStream](#MemoryStream) this contains its
     * content decoded to a String with this streams encoding. Otherwise contains
     * an empty String.
     */
    Object.defineProperty(this, "content", {
        get: function() {
            const wrappedContent = io.content;
            if (!wrappedContent) {
                return "";
            }
            return wrappedContent.decodeToString(charset);
        }
    });

    /**
     * The wrapped binary stream.
     */
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
 * @param {Binary} source The source to be written from
 * @param {Number} begin optional
 * @param {Number} end optional
 * @function
 */

/**
 * Read up to `maxBytes` bytes from the stream, or until the end of the stream
 * has been reached. If `maxBytes` is not specified, the full stream is read
 * until its end is reached. Reading from a stream where the end has already been
 * reached returns an empty ByteString.
 * @name Stream.prototype.read
 * @param {Number} maxBytes the maximum number of bytes to read
 * @returns {ByteString}
 * @function
 */

/**
 * Read bytes from this stream into the given buffer. This method does
 * *not* increase the length of the buffer.
 * @name Stream.prototype.readInto
 * @param {ByteArray} buffer the buffer
 * @param {Number} begin optional begin index, defaults to 0.
 * @param {Number} end optional end index, defaults to buffer.length - 1.
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
 * @return {Boolean} true if the stream has been closed
 * @function
 */

/**
 * Returns true if the stream supports reading, false otherwise.
 * @name Stream.prototype.readable
 * @return {Boolean} true if stream is readable
 * @function
 */

/**
 * Returns true if the stream is randomly accessible and supports the length
 * and position properties, false otherwise.
 * @name Stream.prototype.seekable
 * @return {Boolean} true if stream is seekable
 * @function
 */

/**
 * Returns true if the stream supports writing, false otherwise.
 * @name Stream.prototype.writable
 * @return {Boolean} true if stream is writable
 * @function
 */

/**
 * Get the Java input or output stream instance wrapped by this Stream.
 * @name Stream.prototype.unwrap
 * @function
 */

/**
 * The wrapped `java.io.InputStream`.
 * @name Stream.prototype.inputStream
 * @property
 * @type java.io.InputStream
 */

/**
 * The wrapped `java.io.OutputStream`.
 * @name Stream.prototype.outputStream
 * @property
 * @type java.io.OutputStream
 */
