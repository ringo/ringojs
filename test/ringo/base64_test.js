const assert = require("assert");
const base64 = require('ringo/base64');
const {toByteString} = require('binary');

const data = [
    ["pleasure", "cGxlYXN1cmU="],
    ["leasure", "bGVhc3VyZQ=="],
    ["easure", "ZWFzdXJl"],
    ["asure", "YXN1cmU="],
    ["sure", "c3VyZQ=="],
    ["\u2665", "4pml"]
];

exports.testEncodeDecode = function () {
    data.forEach(test => {
        assert.strictEqual(base64.encode(test[0]), test[1]);
        assert.strictEqual(base64.decode(base64.encode(test[0])), test[0]);
        assert.deepEqual(base64.decode(
            base64.encode(test[0]), 'raw').toArray(),
            toByteString(test[0], 'utf8').toArray());
    });
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
