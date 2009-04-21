include('helma/unittest');

export('testCase');

var testCase = new TestCase("narwhal/io");

testCase.testReadFixed = function() {
    var IO = require('io').IO;
    var io = new IO(getResource('test/narwhal/io_test.js').inputStream, null);
    var bytes = io.read(7);
    assertEqual(bytes.getLength(), 7);
    assertEqual(bytes.toString(), 'include');
};

testCase.testReadIndefinite = function() {
    var IO = require('io').IO;
    var resource = getResource('test/narwhal/io_test.js');
    var io = new IO(resource.inputStream, null);
    var bytes = io.read();
    assertEqual(bytes.getLength(), resource.length);
    assertEqual(bytes.toString(), resource.content);
}