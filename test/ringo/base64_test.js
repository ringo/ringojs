include('ringo/unittest');
var base64 = require('ringo/base64');
var {ByteString} = require('binary');

var data = [
    ["pleasure", "cGxlYXN1cmU="],
    ["leasure", "bGVhc3VyZQ=="],
    ["easure", "ZWFzdXJl"],
    ["asure", "YXN1cmU="],
    ["sure", "c3VyZQ=="],
    ["♥", "4pml"]
];

exports.testEncodeDecode = function () {
    for each (var test in data) {
        assertEqual(base64.encode(test[0]), test[1]);
        assertEqual(base64.decode(base64.encode(test[0])), test[0]);
        assertEqual(base64.decode(
                base64.encode(test[0]), 'raw').toArray(),
                new ByteString(test[0], 'utf8').toArray());
    }
};
