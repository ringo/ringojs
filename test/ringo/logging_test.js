const assert = require("assert");
const system = require("system");

exports.testSetLoggingConfig = function() {
    const logging = require("ringo/logging");

    assert.throws(() => {
        logging.setConfig("./invalid/path/foo");
    });

    assert.throws(() => {
        logging.setConfig(getResource("./invalid/path/foo"));
    });

    try {
        const defaultConfig = getResource("../../modules/config/log4j2.properties");
        logging.setConfig(defaultConfig)
    } catch(e) {
        assert.fail("Could not set default config: " + defaultConfig);
    }
};

// start the test runner if we're called directly from command line
if (require.main === module) {
    system.exit(require("test").run(exports));
}
