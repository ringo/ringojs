include('ringo/unittest');
var Parser = require('ringo/args').Parser;

exports.setUp = exports.tearDown = function() {}

exports.testBasic = function () {
    var p = new Parser();
    p.addOption("q", null, null, "Be quiet about errors and warnings");
    p.addOption("s", "silent", null, "Ignore errors and warnings");
    p.addOption("c", "counter", "NUMBER", "Init counter with NUMBER");
    assertEqual({silent: true}, p.parse(['-s']));
    assertEqual({silent: true}, p.parse(['--silent']));
    assertEqual({q: true}, p.parse(['-q']));
    assertEqual({counter: "42"}, p.parse(['-c', '42']));
    assertEqual({counter: "42"}, p.parse(['-c42']));
    assertEqual({counter: "42"}, p.parse(['--counter=42']));
    assertEqual({counter: "42"}, p.parse(['--counter', '42']));
    assertEqual({counter: "42", silent: true, q: true}, p.parse(['-sqc42']));
    assertEqual({counter: "42", silent: true, q: true}, p.parse(['-sqc', '42']));
    // missing option argument
    assertThrows(function() {p.parse(['--counter']);});
    assertThrows(function() {p.parse(['-c']);});
    assertThrows(function() {p.parse(['-sqc']);});
    // unknown option
    assertThrows(function() {p.parse(['--unknown']);});
    assertThrows(function() {p.parse(['-u']);});
    assertThrows(function() {p.parse(['-squ']);});
}
