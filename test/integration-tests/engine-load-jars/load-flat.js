const assert = require("assert");
const {loadJars} = require("ringo/engine");

loadJars(module.resolve("./jar-files/"), false);

exports.testLevel1GuavaJar = function() {
    const joiner = com.google.common.base.Joiner.on("; ").skipNulls();
    assert.strictEqual(joiner.join("Hello", null, "from", "RingoJS"), "Hello; from; RingoJS");
}

exports.testLevel3JSoupJar = function() {
    let threwException = false;
    try {
        const doc = org.jsoup.Jsoup.parse("<html><head><title>RingoJS</title></head><body></body></html>");
        assert.fail("Jsoup should be not available!");
    } catch (e) {
        threwException = true;
        assert.strictEqual(e.constructor.name, "TypeError");
    } finally {
        assert.isTrue(threwException);
    }
}

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
