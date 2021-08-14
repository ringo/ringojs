const assert = require('assert');
const changeMe = require('skeleton');

exports.testSomething = () => {
    assert.ok(true);
};

if (require.main == module) {
    system.exit(require('test').run(exports));
}
