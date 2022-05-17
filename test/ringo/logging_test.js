const assert = require("assert");
const system = require("system");

const {LogManager} = org.apache.logging.log4j;

exports.testSetLoggingConfig = function() {
    const logging = require("ringo/logging");

    assert.throws(() => {
        logging.setConfig("./invalid/path/foo");
    });

    assert.throws(() => {
        logging.setConfig(getResource("./invalid/path/foo"));
    });

    const logContext = LogManager.getContext(false);
    const previousConfigLocation = logContext.getConfigLocation();
    try {
        const defaultConfig = getResource("../../modules/config/log4j2.properties");
        logging.setConfig(defaultConfig);
        assert.isTrue(logContext.getConfigLocation() instanceof java.net.URI);
        assert.isTrue(logContext.getConfigLocation().equals(defaultConfig.url.toURI()));
    } catch(e) {
        assert.fail("Could not set default config: " + defaultConfig);
    } finally {
        // revert back to the configuration used before, otherwise the above
        // test would impact logging of following tests
        logContext.setConfigLocation(previousConfigLocation);
        logContext.updateLoggers();
        if (previousConfigLocation !== null) {
            assert.isTrue(logContext.getConfigLocation().equals(previousConfigLocation));
        }
    }
};

// start the test runner if we're called directly from command line
if (require.main === module) {
    system.exit(require("test").run(exports));
}
