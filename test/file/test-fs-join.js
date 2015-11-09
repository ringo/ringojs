var assert = require("assert");
var fs = require('fs');
var SEP = require('ringo/utils/files').separator;

var tests = [
    // actual value                             expected
    ["foo", "bar", "baz.js"],                   ["foo", "bar", "baz.js"].join(SEP),
    ["foo", "bar", ".baz.js"],                  ["foo", "bar", ".baz.js"].join(SEP),
    ["foo", "bar", ".baz"],                     ["foo", "bar", ".baz"].join(SEP),
    ["", ".baz"],                               (".baz"),
    ["", "", ".baz"],                           (".baz"),
    ["foo", "bar", "baz"],                      ["foo", "bar", "baz"].join(SEP),
    ["foo" + SEP, "bar" + SEP + SEP, "baz"] ,   ["foo", "bar", "baz"].join(SEP),
    ["foo", "..", "bar"],                       ("foo" + SEP + ".." + SEP + "bar"),
    ["foo", ".", "bar"],                        ("foo" + SEP + "." + SEP + "bar"),
    [SEP, "foo", ".", "bar"],                   (SEP + "foo" + SEP + "." + SEP + "bar"),
    ["foo" + SEP, ""],                          ("foo"),
    ["", SEP, "foo" + SEP, ""],                 (SEP + "foo"),
    [" ", "."],                                 (" " + SEP + "."),
    [" ", ".."],                                (" " + SEP + ".."),
    [SEP, SEP + "foo"],                         (SEP + "foo"),
    [SEP, SEP, SEP + "foo"],                    (SEP + "foo"),
    [SEP, SEP, SEP + SEP + "foo"],              (SEP + "foo"),
    ["." + SEP, "..", SEP + "foo"],             ("." + SEP + ".." + SEP + "foo"),
    ["." + SEP, "..", "..", SEP + "foo"],       ("." + SEP + ".." + SEP + ".." + SEP + "foo"),
    [".", "..", "..", SEP + "foo"],             ("." + SEP + ".." + SEP + ".." + SEP + "foo"),
    ["", "", "", ""],                           (".")
];

tests.forEach(function(item, index, arr) {
    if (index % 2 == 0) {
        exports["test fs.join('" + item.join("', '") + "')"] = function() {
            assert.equal(fs.join.apply(this, item), arr[index + 1]);
        }
    }
});

if (require.main == module.id) {
    require('system').exit(require("test").run(module.id));
}