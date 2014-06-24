include('io');
var {ByteString} = require('binary');
var assert = require('assert');

exports.testReadFixed = function() {
    var resource = getResource('./io_test.js');
    var io = new Stream(resource.inputStream);
    var bytes = io.read(7);
    assert.strictEqual(bytes.length, 7);
    assert.strictEqual(bytes.decodeToString(), 'include');
};

exports.testReadIndefinite = function() {
    var resource = getResource('./assert.js');
    var io = new Stream(resource.inputStream);
    var bytes = io.read();
    assert.strictEqual(bytes.length, resource.length);
    assert.strictEqual(bytes.decodeToString(), resource.content);
};

exports.testStreamForEach = function() {
    var resource = getResource('./assert.js');
    var io = new Stream(resource.inputStream);
    var str = '';
    var read = 0;
    io.forEach(function(data) {
        read += data.length;
        str += data.decodeToString();
    });
    assert.strictEqual(read, resource.length);
    assert.strictEqual(str, resource.content);
};

exports.testMemoryStream = function() {
    var m = new MemoryStream(20);
    var line = 'Lorem ipsum dolor sit amet, eam suas agam phaedrum an, cetero ' +
               'apeirian id vix, menandri evertitur eu cum.';
    var bytes = line.toByteString();
    for (var i = 0; i < 100; i++) {
        m.write(bytes);
    }
    assert.equal(m.length, bytes.length * 100);
    assert.equal(m.position, bytes.length * 100);
    m.position = 0;
    for (var j = 0; j < 100; j++) {
        assert.deepEqual(m.read(bytes.length), bytes);
    }
    assert.deepEqual(m.read(bytes.length), new ByteString());
}

exports.testTextStream = function() {
    // Carriage return should be dropped
    var input = new java.io.ByteArrayInputStream((new java.lang.String("Hello\r\nWorld!")).getBytes("UTF-8"));
    var stream = new TextStream(new Stream(input));
    var lines = stream.readLines();

    assert.strictEqual(lines[0], "Hello\n");
    assert.strictEqual(lines[1], "World!");

    // Try to write a read-only stream
    try {
        stream.writeLine("Hello World!");
        assert.fail("writeLine() should throw an error!");
    } catch (err) {
        assert.strictEqual(err.name, "Error");
        assert.strictEqual(err.message, "The TextStream is not writable!");
    }
    stream.close();

    // Check writing
    var output = new java.io.ByteArrayOutputStream();
    stream = new TextStream(new Stream(output));
    stream.writeLine("Hello");
    stream.write("World!");
    stream.close();
    assert.strictEqual(output.toString(), "Hello\nWorld!");
};

if (module == require.main) {
    require("test").run(exports);
}
