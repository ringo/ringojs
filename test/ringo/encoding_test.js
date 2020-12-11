const assert = require("assert");
const {Encoder, Decoder} = require('ringo/encoding');
const binary = require('binary');
const {MemoryStream, TextStream} = require('io');

const str = "I \u2665 JS";
const bytes = new binary.ByteString([73,32,226,153,165,32,74,83]);

exports.testEncoder = function() {
    const enc = new Encoder("utf-8");
    enc.encode(str).encode(str);
    assert.strictEqual(str + str, enc.toByteString().decodeToString("utf-8"));
    enc.encode(str);
    assert.strictEqual(str + str + str, enc.toByteString().decodeToString("utf-8"));
    enc.clear().encode(str);
    assert.strictEqual(str, enc.toByteString().decodeToString("utf-8"));
};

exports.testSmallEncoder = function() {
    const enc = new Encoder("utf-8", false, 2);
    enc.encode(str).encode(str);
    assert.strictEqual(str + str, enc.toByteString().decodeToString("utf-8"));
    enc.encode(str);
    assert.strictEqual(str + str + str, enc.toByteString().decodeToString("utf-8"));
    enc.clear().encode(str);
    assert.strictEqual(str, enc.toByteString().decodeToString("utf-8"));
};

exports.testStreamEncoder = function() {
    const enc = new Encoder("utf-8");
    const stream = new MemoryStream();
    enc.writeTo(stream);
    enc.encode(str).encode(str);
    assert.strictEqual(enc.length, 0);
    assert.strictEqual(str + str, stream.content.decodeToString("utf-8"));
    enc.encode(str);
    assert.strictEqual(enc.length, 0);
    assert.strictEqual(str + str + str, stream.content.decodeToString("utf-8"));
    enc.clear().encode(str);
    assert.strictEqual(enc.length, 0);
    assert.strictEqual(str + str + str + str, stream.content.decodeToString("utf-8"));
};

exports.testDecoder = function() {
    const dec = new Decoder("utf-8");
    dec.decode(bytes).decode(bytes);
    assert.strictEqual(str + str, dec.toString());
    dec.decode(bytes);
    assert.strictEqual(str + str + str, dec.toString());
    dec.clear().decode(bytes);
    assert.strictEqual(str, dec.toString());
};

exports.testDecoderSmall = function() {
    const dec = new Decoder("utf-8", false, 2);
    dec.decode(bytes).decode(bytes);
    assert.strictEqual(str + str, dec.toString());
    dec.decode(bytes);
    assert.strictEqual(str + str + str, dec.toString());
    dec.clear().decode(bytes);
    assert.strictEqual(str, dec.toString());
};

exports.testStreamDecoder = function() {
    const dec = new Decoder("utf-8");
    const stream = new MemoryStream();
    stream.write(bytes.concat(bytes).concat(bytes));
    stream.position = 0;
    dec.readFrom(stream);
    assert.strictEqual(str + str + str, dec.read());
    assert.strictEqual(null, dec.read());
    assert.strictEqual(0, dec.length);
};

exports.testStreamDecoderReadLine = function() {
    const dec = new Decoder("utf-8");
    const stream = new MemoryStream();
    (new TextStream(stream, {charset: "utf-8"})).writeLine(str).writeLine(str).writeLine(str);
    stream.position = 0;
    dec.readFrom(stream);
    assert.strictEqual(str, dec.readLine());
    assert.strictEqual(str, dec.readLine());
    assert.strictEqual(str, dec.readLine());
    assert.strictEqual(null, dec.readLine());
    assert.strictEqual(0, dec.length);
};

exports.testStreamDecoderReadLineShort = function() {
    const line = "The quick brown fox jumps over the lazy dog";
    const dec = new Decoder("utf-8", false, 2);
    const stream = new MemoryStream();
    (new TextStream(stream, {charset: "utf-8"})).writeLine(line).writeLine(line).writeLine(line);
    stream.position = 0;
    dec.readFrom(stream);
    assert.strictEqual(line, dec.readLine());
    assert.strictEqual(line, dec.readLine());
    assert.strictEqual(line, dec.readLine());
    assert.strictEqual(null, dec.readLine());
    assert.strictEqual(0, dec.length);
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
