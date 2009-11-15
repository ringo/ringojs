include('helma/unittest');
var Parser = require('helma/args').Parser;

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
    assertEqual({counter: "42"}, p.parse(['--counter=42']));
}
