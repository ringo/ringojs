
export("Encoder", "Decoder");

module.shared = true;

var log = require("ringo/logging").getLogger(module.id);

var {Charset, CharsetEncoder, CharsetDecoder, CodingErrorAction} = java.nio.charset;
var {ByteBuffer, CharBuffer} = java.nio;

var linePattern = java.util.regex.Pattern.compile("\r\n|\n|\r");

var DEFAULTSIZE = 8192;

function Decoder(charset, strict, capacity) {

    if (!(this instanceof Decoder)) {
        return new Decoder(charset, strict, capacity);
    }

    capacity = capacity || DEFAULTSIZE;
    var decoder = Charset.forName(charset).newDecoder();
    var input = ByteBuffer.allocate(capacity);
    var output = CharBuffer.allocate(decoder.averageCharsPerByte() * capacity);
    var stream;
    var mark = 0;
    log.debug("created decoder for", charset);

    var errorAction = strict ?
            CodingErrorAction.REPORT : CodingErrorAction.REPLACE;
    decoder.onMalformedInput(errorAction);
    decoder.onUnmappableCharacter(errorAction);

    var decoded;

    this.decode = function(bytes, start, end) {
        start = start || 0;
        end = end || bytes.length;
        while (end > start) {
            var count = Math.min(end - start, input.capacity() - input.position());
            input.put(bytes, start, count);
            input.flip();
            var result = decoder.decode(input, output, false);
            while (result.isOverflow()) {
                // grow output buffer
                capacity += Math.max(capacity, end - start);
                log.debug("Growing decoder output buffer to", capacity);
                var newOutput = CharBuffer.allocate(1.2 * capacity * decoder.averageCharsPerByte());
                output.flip();
                newOutput.append(output);
                output = newOutput;
                result = decoder.decode(input, output, false);
            }
            start += count;
            if (result.isError()) {
                decoder.reset();
                input.clear();
                throw new Error(result);
            }
            input.compact();
        }
        decoded = null;
        return this;
    };

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

    function searchNewline() {
        output.flip();
        try {
            var matcher = linePattern.matcher(output);
            var result = matcher.find(mark);
        } finally {
            output.position(output.limit());
            output.limit(output.capacity());
        }
        return result;
    }

    this.readLine = function(includeNewline) {
        var eof = false;
        while (stream && !eof && !searchNewline()) {
            var b = stream.read(4096);
            log.debug("Read", b.length, "bytes from stream");
            if (b.length == 0) {
                // end of stream has been reached
                eof = true;
            } else {
                this.decode(b);
            }
        }
        output.flip();
        var matcher = linePattern.matcher(output);
        var result;
        if (matcher.find(mark)) {
            var pos = matcher.start();
            var nline = matcher.group().length;
            result = String(output.subSequence(mark, includeNewline ? pos + nline : pos));
            mark = pos + nline;
            output.position(output.limit());
            output.limit(output.capacity());
        } else if (eof) {
            result =  mark == output.limit() ?
                    null : String(output.subSequence(mark, output.limit()));
            this.clear();
        } else {
            output.position(mark);
            output.compact();
            var buffer = ByteArray.wrap(input.array());

            mark = 0;
            result = null;
        }
        return result;
    };

    this.toString = function() {
        if (decoded == null) {
            decoded = output.flip().toString();
            output.position(output.limit());
            output.limit(output.capacity());
        }
        return decoded;
    };

    this.hasPendingInput = function() {
        return input.position() > 0;
    };

    this.readFrom = function(source) {
        stream = source;
    };

    this.clear = function() {
        decoded = null;
        output.clear();
        mark = 0;
    };

    Object.defineProperty(this, "length", {
        get: function() {
            return output.position();
        }
    });
}

function Encoder(charset, strict, capacity) {

    if (!(this instanceof Encoder)) {
        return new Encoder(charset, strict, capacity);
    }

    capacity = capacity || DEFAULTSIZE;
    var encoder = Charset.forName(charset).newEncoder();
    var encoded = new ByteArray(capacity);
    var output = ByteBuffer.wrap(encoded);
    var stream;
    log.debug("created encoder for", charset);

    var errorAction = strict ?
            CodingErrorAction.REPORT : CodingErrorAction.REPLACE;
    encoder.onMalformedInput(errorAction);
    encoder.onUnmappableCharacter(errorAction);

    this.encode = function(string, start, end) {
        start = start || 0;
        end = end || string.length;
        var input = CharBuffer.wrap(string, start, end);
        var result = encoder.encode(input, output, false);
        while (result.isOverflow()) {
            // grow output buffer
            capacity += Math.max(capacity, Math.round(1.2 * (end - start) * encoder.averageBytesPerChar()));
            encoded.length = capacity;
            log.debug("Growing encoder output buffer to", capacity);
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

    this.toByteString = function() {
        return ByteString.wrap(encoded.slice(0, output.position()));
    };

    this.toByteArray = function() {
        return encoded.slice(0, output.position());
    };

    this.writeTo = function(sink) {
        stream = sink;
    };

    this.clear = function() {
        output.clear();
    };

    Object.defineProperty(this, "length", {
        get: function() {
            return output.position();
        }
    });
}
