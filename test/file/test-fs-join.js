var assert = require("assert");
var fs = require('fs');
var SEP = require('ringo/utils/files').separator;

var File = java.io.File;
var Paths = java.nio.file.Paths;

var POSIX = java.nio.file.FileSystems.getDefault().supportedFileAttributeViews().contains("posix");
var WIN32 = !POSIX && java.lang.System.getenv("SystemRoot") != null;

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
    ["foo" + SEP, ""],                          ("foo"),
    ["." + SEP, "..", SEP + "foo"],             ("." + SEP + ".." + SEP + "foo"),
    ["." + SEP, "..", "..", SEP + "foo"],       ("." + SEP + ".." + SEP + ".." + SEP + "foo"),
    [".", "..", "..", SEP + "foo"],             ("." + SEP + ".." + SEP + ".." + SEP + "foo"),
    [".", null],                                ("."),
    ["", "", "", ""],                           ("."),
    [Paths.get("." + SEP + "foo")],             ("." + SEP + "foo"),
    [new File("." + SEP + "foo")],              ("." + SEP + "foo")
];

var posixSpecific = [
    [" ", "."],                                 (" /."),
    [" ", ".."],                                (" /.."),
    ["", "/", "foo/", ""],                      ("/foo"),
    ["/", "foo", ".", "bar"],                   ("/foo/./bar"),
    ["/", "/" + "foo"],                         ("/foo"),
    ["/", "/", "/foo"],                         ("/foo"),
    ["/", "/", "//foo"],                        ("/foo")
];

var windowsSpecific = [
    [""],                                       ("."),
    ["C:\\"],                                   ("C:\\"),
    ["C:"],                                     ("C:"),
    ["C:tmp.txt"],                              ("C:tmp.txt"),
    ["C:dir","tmp.txt"],                        ("C:dir\\tmp.txt"),
    ["C:\\tmp.txt"],                            ("C:\\tmp.txt"),
    ["C:\\dir", "file"],                        ("C:\\dir\\file"),
    ["C:\\dir", ".file"],                       ("C:\\dir\\.file"),
    ["C:\\dir", "file.txt"],                    ("C:\\dir\\file.txt"),
    ["\\\\server", "share"],                    ("\\\\server\\share\\"),
    ["\\\\server", "share", ""],                ("\\\\server\\share\\"),
    ["", "\\\\server", "share"],                ("\\\\server\\share\\"),
    ["\\\\server", "share", "folder"],          ("\\\\server\\share\\folder"),
    ["\\\\127.0.0.1", "a"],                     ("\\\\127.0.0.1\\a\\"),
    ["\\\\2001-db8--2468-1357-abcd-3456.ipv6-literal.net", "a"], ("\\\\2001-db8--2468-1357-abcd-3456.ipv6-literal.net\\a\\")
];


// adds given test to the exports object
var testHelper = function(item, index, arr) {
    if (index % 2 == 0) {
        exports["test fs.join('" + item.join("', '") + "')"] = function() {
            assert.equal(fs.join.apply(this, item), arr[index + 1]);
        }
    }
};

// questionable, but kept for compatibility
exports.testNonStringInput = function() {
    assert.equal(fs.join("foo", {}, "baz.js"), "foo" + SEP + "[object Object]" + SEP + "baz.js");
    assert.equal(fs.join("foo", [], "baz.js"), "foo" + SEP + "baz.js");
    assert.equal(fs.join("foo", null, "baz.js"), "foo" + SEP + "baz.js");
    assert.equal(fs.join("foo", undefined, "baz.js"), "foo" + SEP + "baz.js");
    assert.equal(fs.join(".", 10), "." + SEP + "10");

    // skip this test on Windows
    if (POSIX) {
        assert.equal(fs.join(".", new Date(2010, 10, 10)), "." + SEP + new Date(2010, 10, 10));
    }
};

// common test for all OS
tests.forEach(testHelper);

// POSIX / Unix FS tests
if (POSIX) {
    posixSpecific.forEach(testHelper);
}

// Windows / DOS tests
if (WIN32) {
    windowsSpecific.forEach(testHelper);
}

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}