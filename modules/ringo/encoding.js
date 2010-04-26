
export("Encoder", "Decoder");

var {Charset, CharsetEncoder, CharsetDecoder, CodingErrorAction} = java.nio.charset;
var {ByteBuffer, CharBuffer} = java.nio;

function Decoder(charset, strict, capacity) {

    if (!(this instanceof Decoder)) {
        return new Decoder(charset, strict, capacity);
    }

    capacity = capacity || 1024;
    var decoder = Charset.forName(charset).newDecoder();
    var input = ByteBuffer.allocate(capacity);
    var output = CharBuffer.allocate(decoder.averageCharsPerByte() * capacity);

    var errorAction = strict ?
            CodingErrorAction.REPORT : CodingErrorAction.REPLACE;
    decoder.onMalformedInput(errorAction);
    decoder.onUnmappableCharacter(errorAction);

    var decoded;

    this.decode = function(bytes, start, end) {
        start = start || 0;
        end = end || bytes.length;
        input.put(bytes, start, end - start);
        input.flip();
        var result = decoder.decode(input, output, false);
        if (result.isError()) {
            decoder.reset();
            input.clear();
            throw new Error(result);
        }
        decoded = null;
        input.compact();
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

    this.clear = function() {
        decoded = null;
        output.clear();
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

    capacity = capacity || 1024;
    var encoder = Charset.forName(charset).newEncoder();
    var encoded = new ByteArray(capacity);
    var output = ByteBuffer.wrap(encoded);

    var errorAction = strict ?
            CodingErrorAction.REPORT : CodingErrorAction.REPLACE;
    encoder.onMalformedInput(errorAction);
    encoder.onUnmappableCharacter(errorAction);

    this.encode = function(string, start, end) {
        start = start || 0;
        end = end || string.length;
        var input = CharBuffer.wrap(string, start, end);
        var result = encoder.encode(input, output, false);
        if (result.isError()) {
            encoder.reset();
            throw new Error(result);
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
        return this;
    };

    this.toString = function() {
        return "[Encoder " + output.position() + "]";
    };

    this.toByteString = function() {
        return encoded.slice(0, output.position());
    };

    this.toByteArray = function() {
        return encoded.slice(0, output.position());
    };

    this.clear = function() {
        encoded.length = 0;
        output.clear();
    };

    Object.defineProperty(this, "length", {
        get: function() {
            return output.position();
        }
    });
}
