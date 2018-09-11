const assert = require("assert");

exports.testLetScope = function() {
    let x = 1;

    if (x === 1) {
        let x = 2;
        assert.equal(x, 2);
    }

    assert.equal(x, 1);
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
