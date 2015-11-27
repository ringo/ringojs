var assert = require("assert");
var {join} = require("fs");
var SEPARATOR = require('ringo/utils/files').separator;

// the old implementation
var join_011 = function() {
    var args = Array.prototype.filter.call(arguments, function(p) p != "");
    return args.join(SEPARATOR);
};

// these tests should work as in 0.11
var positiveTests = [
    ["foo", "bar", "baz.js"],
    ["foo", "bar", ".baz.js"],
    ["foo", "bar", ".baz"],
    ["", ".baz"],
    ["", "", ".baz"],
    ["foo", "bar", "baz"],
    ["foo", "..", "bar"],
    ["foo", ".", "bar"],
    ["." + SEPARATOR + "foo"]
];

var negativeTests = [
    ["foo" + SEPARATOR, ""],
    ["foo" + SEPARATOR, "bar" + SEPARATOR + SEPARATOR, "baz"],
    ["." + SEPARATOR, "..", SEPARATOR + "foo"],
    ["." + SEPARATOR, "..", "..", SEPARATOR + "foo"],
    [".", "..", "..", SEPARATOR + "foo"],
    [".", null]
];

positiveTests.forEach(function(item, index, arr) {
    exports["test compat fs.join('" + item.join("', '") + "')"] = function() {
        assert.equal(join.apply(this, item), join_011.apply(this, item));
    }
});

negativeTests.forEach(function(item, index, arr) {
    exports["test compat fs.join('" + item.join("', '") + "')"] = function() {
        assert.notEqual(join.apply(this, item), join_011.apply(this, item));
    }
});

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}