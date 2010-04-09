
export("Encoder", "Decoder");

var {Charset, CharsetEncoder, CharsetDecoder, CodingErrorAction} = java.nio.charset;
var {ByteBuffer, CharBuffer} = java.nio;

function Decoder(charset, capacity, strict) {

    if (!this instanceof Decoder) {
        return new Decoder(charset, capacity);
    }

    capacity = capacity || 1024;
    var decoder = Charset.forName(charset).newDecoder();
    var input = ByteBuffer.allocate(capacity);
    var output = CharBuffer.allocate(decoder.averageCharsPerByte() * capacity);

    var errorHandler = strict ?
            CodingErrorAction.REPORT : CodingErrorAction.REPLACE;
    decoder.onMalformedInput(errorHandler);
    decoder.onUnmappableCharacter(errorHandler);

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
    })
}