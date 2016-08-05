var assert = require("assert");

var a = module.singleton("undefinedSingleton");
var b = module.singleton("functionSingleton");
var c = module.singleton("objectSingleton");

exports.testUndefined = function() {
    assert.isUndefined(a);
    assert.isUndefined(module.singleton("undefinedSingleton"));
    assert.isTrue(module.singleton("undefinedSingleton", function() { return true; }));
    assert.isUndefined(a);
    assert.isTrue(module.singleton("undefinedSingleton"));
};

exports.testFunctionSingleton = function() {
    var val = 12345;

    assert.isUndefined(b);
    assert.isUndefined(module.singleton("functionSingleton"));
    assert.strictEqual(module.singleton("functionSingleton", function() { return val - 12345; }), 0);
    assert.isUndefined(b);
    assert.strictEqual(module.singleton("functionSingleton"), 0);
    var shouldNotChange = module.singleton("functionSingleton", function() { return val; });
    assert.strictEqual(shouldNotChange, 0);
    assert.strictEqual(module.singleton("functionSingleton"), 0);
};

exports.testObjectSingleton = function() {
    var val = {
        a: "hello",
        b: {
            c: "world",
            d: 12345
        }
    };

    assert.isUndefined(c);
    assert.isUndefined(module.singleton("objectSingleton"));
    assert.deepEqual(module.singleton("objectSingleton", val), {
        a: "hello",
        b: {
            c: "world",
            d: 12345
        }
    });
    assert.isUndefined(c);
    assert.deepEqual(module.singleton("objectSingleton"), {
        a: "hello",
        b: {
            c: "world",
            d: 12345
        }
    });

    var shouldNotChange = module.singleton("objectSingleton", { hello: "world" });
    assert.deepEqual(shouldNotChange, {
        a: "hello",
        b: {
            c: "world",
            d: 12345
        }
    });
    assert.deepEqual(module.singleton("objectSingleton"), {
        a: "hello",
        b: {
            c: "world",
            d: 12345
        }
    });
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}