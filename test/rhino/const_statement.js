const assert = require("assert");

exports.testConstNonStandardBehavior = function() {
    assert.equal(eval('(function() {const x = "y"; x = "z"; return x;})()'), "y");
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
