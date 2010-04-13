include('ringo/unittest');
include('io');

exports.testReadFixed = function() {
    var resource = getResource('./io_test.js');
    var io = new Stream(resource.inputStream);
    var bytes = io.read(7);
    assertEqual(bytes.length, 7);
    assertEqual(bytes.decodeToString(), 'include');
};

exports.testReadIndefinite = function() {
    var resource = getResource('./ringo/unittest_test.js');
    var io = new Stream(resource.inputStream);
    var bytes = io.read();
    assertEqual(bytes.length, resource.length);
    assertEqual(bytes.decodeToString(), resource.content);
};
