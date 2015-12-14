var assert = require("assert");

var calc = require("./calculator");

exports.testCalculator = function() {
    assert.equal(calc.add(3,5), 8);
    assert.equal(calc.substract(5,3), 2);
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}