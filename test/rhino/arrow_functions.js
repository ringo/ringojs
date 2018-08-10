const assert = require("assert");

exports.testArrowFunction = function() {
    assert.equal([1,2,3,4].map(el => el * 2).join("-"), "2-4-6-8");
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
