const system = require("system");
const assert = require("assert");

exports.testEnv = function() {
    assert.throws(() => {
        system.env.foo = "bar";
    });
    assert.throws(() => {
        system.env.foo = {};
    });
}

exports.testProperties = function() {
    assert.throws(() => {
        system.properties.foo = "bar";
    });
    assert.throws(() => {
        system.properties.foo = {};
    });

    assert.isTrue(typeof system.properties["java.version"] === "string");

    assert.isUndefined(system.properties["system.test"]);
    java.lang.System.setProperty("system.test", "running");
    assert.strictEqual(system.properties["system.test"], "running");
    java.lang.System.clearProperty("system.test");
    assert.isUndefined(system.properties["system.test"]);
};

if (require.main === module) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
