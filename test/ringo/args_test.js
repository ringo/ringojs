const assert = require("assert");
const Parser = require('ringo/args').Parser;

exports.setUp = exports.tearDown = function() {}

exports.testBasic = function () {
    const p = new Parser();
    p.addOption("q", null, null, "Be quiet about errors and warnings");
    p.addOption("s", "silent", null, "Ignore errors and warnings");
    p.addOption("c", "counter", "NUMBER", "Init counter with NUMBER");
    assert.strictEqual(p.help(), " -q                   Be quiet about errors and warnings\n" +
                                 " -s --silent          Ignore errors and warnings\n" +
                                 " -c --counter NUMBER  Init counter with NUMBER");
    assert.deepEqual(p.parse(['-s']), {silent: true});
    assert.deepEqual(p.parse(['--silent']), {silent: true});
    assert.deepEqual(p.parse(['-q']), {q: true});
    assert.deepEqual(p.parse(['-c', '42']), {counter: "42"});
    assert.deepEqual(p.parse(['-c42']), {counter: "42"});
    assert.deepEqual(p.parse(['--counter=42']), {counter: "42"});
    assert.deepEqual(p.parse(['--counter', '42']), {counter: "42"});
    assert.deepEqual(p.parse(['-sqc42']), {counter: "42", silent: true, q: true});
    assert.deepEqual(p.parse(['-sqc', '42']), {counter: "42", silent: true, q: true});
    // missing option argument
    assert.throws(() => p.parse(['--counter']));
    assert.throws(() => p.parse(['-c']));
    assert.throws(() => p.parse(['-sqc']));
    // unknown option
    assert.throws(() => p.parse(['--unknown']));
    assert.throws(() => p.parse(['-u']));
    assert.throws(() => p.parse(['-squ']));
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
