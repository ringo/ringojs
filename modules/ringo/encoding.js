/**
 * @fileOverview Low-level support for character encoding and decoding.
 * It uses the packages java.nio and java.nio.charset for the underlying operations.
 *
 * @example var enc = new Encoder('utf-8');
 * enc.encode('I \u2665 JS').encode('I \u2665 JS');
 * var bs = enc.toByteString();
 *
 * // prints 'I ♥ JSI ♥ JS'
 * console.log(bs.decodeToString('utf-8'));
 *
 * var dec = new Decoder('ISO-8859-1');
 * var ba = new ByteArray([246, 228, 252]);
 *
 * // prints öäü
 * console.log(dec.decode(ba));
 */

export("Encoder", "Decoder");

var log = require("ringo/logging").getLogger(module.id);

var {Charset, CharsetEncoder, CharsetDecoder, CodingErrorAction} = java.nio.charset;
var {ByteBuffer, CharBuffer} = java.nio;
var StringUtils = org.ringojs.util.StringUtils;
var JavaString = java.lang.String;

var DEFAULTSIZE = 8192;

/**
 * Creates a new Decoder to transform a ByteString or ByteArray to a string.
 *
 * @param {String} charset the charset name
 * @param {Boolean} strict if true, unmappable characters stop the decoder and throw an exception, otherwise
 *                         malformed input is replaced with a substitution character
 * @param {Number} capacity initial capacity for the input byte buffer and output character buffer. The output buffer's
 *                          size depends on the average bytes used per character by the charset.
 * @example // throws an Error: MALFORMED[1]
 * var dec = new Decoder('ASCII', true);
 * dec.decode(new ByteArray([246, 228, 252, 999999]));
 *
 * // replaces 999999 with a substitutions character ���
 * var dec = new Decoder('ASCII');
 * dec.decode(new ByteArray([246, 228, 252, 999999]));
 */
function Decoder(charset, strict, capacity) {

    if (!(this instanceof Decoder)) {
        return new Decoder(charset, strict, capacity);
    }

    var decoder = Charset.forName(charset).newDecoder();
    // input buffer must be able to contain any character
    capacity = Math.max(capacity, 8) || DEFAULTSIZE;
    var input = ByteBuffer.allocate(capacity);
    var output = CharBuffer.allocate(decoder.averageCharsPerByte() * capacity);
    var stream;
    var mark = 0;

    var errorAction = strict ?
            CodingErrorAction.REPORT : CodingErrorAction.REPLACE;
    decoder.onMalformedInput(errorAction);
    decoder.onUnmappableCharacter(errorAction);

    var decoded;

    /**
     * Decode bytes from the given buffer.
     * @param {binary.Binary} bytes a ByteString or ByteArray
     * @param {Number} start The start index, or 0 if undefined
     * @param {Number} end the end index, or bytes.length if undefined
     */
    this.decode = function(bytes, start, end) {
        start = start || 0;
        end = end || bytes.length;
        while (end > start) {
            var count = Math.min(end - start, input.capacity() - input.position());
            input.put(bytes, start, count);
            decodeInput(end - start);
            start += count;
        }
        decoded = null;
        return this;
    };

    // Internal function
    function decodeInput(remaining) {
        input.flip();
        var result = decoder.decode(input, output, false);
        while (result.isOverflow()) {
            // grow output buffer
            capacity += Math.max(capacity, remaining);
            var newOutput = CharBuffer.allocate(1.2 * capacity * decoder.averageCharsPerByte());
            output.flip();
            newOutput.append(output);
            output = newOutput;
            result = decoder.decode(input, output, false);
        }
        if (result.isError()) {
            decoder.reset();
            input.clear();
            throw new Error(result);
        }
        input.compact();
    }

   /**
    * Closes the decoder for further input. A closed decoder throws a `java.nio.BufferOverflowException`
    * if `decode()` is called again.
    * @returns {Decoder} the decoder
    */
    this.close = function() {
        input.flip();
        var result = decoder.decode(input, output, true);
        if (result.isError()) {
            decoder.reset();
            input.clear();
            throw new Error(result);
        }
        return this;
    };

   /**
    * Reads the whole stream and returns it as a string.
    * This method is only useful if the decoder has a connected stream.
    * @returns {String} the decoded string
    * @see <a href="#readFrom">readFrom</a>
    */
    this.read = function() {
        var eof = false;
        while (stream && !eof) {
            if (mark > 0) {
                output.limit(output.position());
                output.position(mark);
                output.compact();
                mark = 0;
            }
            var position = input.position();
            var read = stream.readInto(ByteArray.wrap(input.array()), position, input.capacity());
            if (read < 0) {
                // end of stream has been reached
                eof = true;
            } else {
                input.position(position + read);
                decodeInput(0);
            }
        }
        output.flip();
        decoded = null; // invalidate
        return mark == output.limit() ?
                    null : String(output.subSequence(mark, output.limit()));
    };

   /**
    * Reads a stream line by line and returns it as a string.
    * This method is only useful if the decoder has a connected stream.
    * @param {Boolean} includeNewline if true, the newline character is included in the result, otherwise not
    * @returns {String} the decoded string or null if stream is empty
    * @see <a href="#readFrom">readFrom</a>
    */
    this.readLine = function(includeNewline) {
        var eof = false;
        var newline = StringUtils.searchNewline(output, mark);
        while (stream && !eof && newline < 0) {
            if (mark > 0) {
                output.limit(output.position());
                output.position(mark);
                output.compact();
                mark = 0;
            }
            var position = input.position();
            var read = stream.readInto(ByteArray.wrap(input.array()), position, input.capacity());
            if (read < 0) {
                // end of stream has been reached
                eof = true;
            } else {
                var from = output.position();
                input.position(position + read);
                decodeInput(0);
                newline = StringUtils.searchNewline(output, from);
            }
        }
        output.flip();
        // get the raw underlying char[] output buffer
        var array = output.array();
        var result;
        if (newline > -1) {
            var isCrlf = array[newline] == 13 && array[newline + 1] == 10;
            if (isCrlf && includeNewline) {
                // We want to add a single newline to the return value. To save us
                // from allocating a new buffer we temporarily mod the existing one.
                array[newline] = 10;
                result = JavaString.valueOf(array, mark, newline + 1 - mark);
                array[newline] = 13;
                mark = newline + 2;
            } else {
                var count = includeNewline ? newline + 1 - mark : newline - mark;
                result = JavaString.valueOf(array, mark, count);
                mark = isCrlf ? newline + 2 : newline + 1;
            }
            output.position(output.limit());
            output.limit(output.capacity());
        } else if (eof) {
            result =  mark == output.limit() ?
                    null : JavaString.valueOf(array, mark, output.limit() - mark);
            this.clear();
        }
        decoded = null; // invalidate cached decoded representation
        return result;
    };

   /**
    * Returns the decoded string.
    * @returns {String} the decoded string
    */
    this.toString = function() {
        if (decoded == null) {
            decoded = JavaString.valueOf(output.array(), mark, output.position() - mark);
        }
        return decoded;
    };

    /**
     * Checks if all bytes are already decoded or if there is pending input.
     * @returns {Boolean} true if there not all bytes are decoded, false otherwise
     */
    this.hasPendingInput = function() {
        return input.position() > 0;
    };

    /**
     * Sets the source stream to read from. Using io streams is an alternative
     * to reading from plain binary ByteArray or ByteString objects.
     * @param {io.Stream} source the source stream
     * @see <a href="../../io/">io streams</a>
     * @example var stream = new MemoryStream();
     * stream.write(...); // write some bytes into the stream
     * stream.position = 0; // reset the pointer
     *
     * var dec = new Decoder('ASCII');
     * dec.readFrom(stream); // connect the stream with the decoder
     * dec.read(); // returns the stream's content as string
     */
    this.readFrom = function(source) {
        stream = source;
        return this;
    };

    /**
     * Clears the character buffer.
     * @example dec.decode(someByteArray);
     * dec.toString(); // returns the decoded string
     * dec.clear();
     * dec.toString(); // returns ''
     */
    this.clear = function() {
        decoded = null;
        output.clear();
        mark = 0;
        return this;
    };

   /**
    * The character buffer's length which uses the Java primitive `char` internally.
    * Each character in the buffer is a 16-bit Unicode character.
    * @see <a href="http://docs.oracle.com/javase/8/docs/api/java/nio/CharBuffer.html">java.nio.CharBuffer</a>
    * @example // an emoji in 4 raw bytes
    * var ba = new ByteArray([0xF0,0x9F,0x98,0x98]);
    *
    * // a UTF-8 based decoder
    * var dec = new Decoder("UTF-8");
    *
    * // prints &#128536;
    * console.log(dec.decode(ba));
    *
    * // prints "2 chars vs. 4 bytes"
    * console.log(dec.length + " chars vs. " + ba.length + " bytes");
    */
    Object.defineProperty(this, "length", {
        get: function() {
            return output.position() - mark;
        }
    });
}

/**
 * Creates a new Encoder to transform string into a binary ByteString or ByteArray.
 * @param {String} charset the charset name
 * @param {Boolean} strict if true, unmappable characters stop the decoder and throw an exception,
 *                         otherwise malformed input is replaced with a substitution character
 * @param {Number} capacity initial capacity for the input character buffer and output byte buffer.
 *                          The binary buffer's size depends on the average bytes used per character by the charset.
 */
function Encoder(charset, strict, capacity) {

    if (!(this instanceof Encoder)) {
        return new Encoder(charset, strict, capacity);
    }

    capacity = capacity || DEFAULTSIZE;
    var encoder = Charset.forName(charset).newEncoder();
    var encoded = new ByteArray(capacity);
    var output = ByteBuffer.wrap(encoded);
    var stream;

    var errorAction = strict ?
            CodingErrorAction.REPORT : CodingErrorAction.REPLACE;
    encoder.onMalformedInput(errorAction);
    encoder.onUnmappableCharacter(errorAction);

    /**
     * Encodes the given string into the encoder's binary buffer.
     * @param {String} string the string to encode
     * @param {Number} start optional index of the first character to encode
     * @param {Number} end optional index of the character after the last character to encode
     * @example // this will only encode 'e' and 'f'
     * enc.encode("abcdef", 4, 6);
     */
    this.encode = function(string, start, end) {
        start = start || 0;
        end = end || string.length;
        var input = CharBuffer.wrap(string, start, end);
        var result = encoder.encode(input, output, false);
        while (result.isOverflow()) {
            // grow output buffer
            capacity += Math.max(capacity, Math.round(1.2 * (end - start) * encoder.averageBytesPerChar()));
            encoded.length = capacity;
            var position = output.position();
            output = ByteBuffer.wrap(encoded);
            output.position(position);
            result = encoder.encode(input, output, false);
        }
        if (result.isError()) {
            encoder.reset();
            throw new Error(result);
        }
        if (stream) {
            stream.write(encoded, 0, output.position());
            // stream.flush();
            this.clear();
        }
        return this;
    };

   /**
    * Closes the encoder.
    * @returns {Encoder} the now closed encoder
    */
    this.close = function() {
        var input = CharBuffer.wrap("");
        var result = encoder.encode(input, output, true);
        if (result.isError()) {
            encoder.reset();
            throw new Error(result);
        }
        if (stream) {
            stream.write(encoded, 0, output.position());
            // stream.flush();
            this.clear();
        }
        return this;
    };

    this.toString = function() {
        return "[Encoder " + output.position() + "]";
    };

   /**
    * Converts the encoded bytes into a ByteString.
    * @returns {ByteString} the resulting ByteString
    */
    this.toByteString = function() {
        return ByteString.wrap(encoded.slice(0, output.position()));
    };

   /**
    * Converts the encoded bytes into a ByteArray.
    * @returns {ByteArray} the resulting ByteArray
    */
    this.toByteArray = function() {
        return encoded.slice(0, output.position());
    };

   /**
    * Sets the output stream to write into. Using io streams as destination is an alternative to writing
    * into plain binary ByteArray or ByteString objects.
    * @param {Stream} sink the destination stream
    * @see <a href="../../io/">io streams</a>
    */
    this.writeTo = function(sink) {
        stream = sink;
        return this;
    };

   /**
    * Clears the byte buffer.
    * @returns {Encoder} the cleared encoder
    */
    this.clear = function() {
        output.clear();
        return this;
    };

   /**
    * The underlying byte buffer's length.
    */
    Object.defineProperty(this, "length", {
        get: function() {
            return output.position();
        }
    });
}
