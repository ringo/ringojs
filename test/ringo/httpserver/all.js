require('ringo/logging').setConfig(getResource('../../log4j2.properties'));

const system = require("system");

exports.testHttpServer = require("./httpserver_test");
exports.testHttpServerBuilder = require("./builder_test");
exports.testEventSource = require("./eventsource_test");
exports.testStatic = require("./static_test");

// Test only executed outside of Github Actions:
if (environment["GITHUB_ACTIONS"] === undefined) {
    exports.testWebSocket = require("./websocket_test");
} else {
    console.warn("Skipping websocket_test.js");
}

if (require.main === module) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
