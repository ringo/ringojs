require('ringo/logging').setConfig(getResource('../../log4j2.properties'));

const system = require("system");
const assert = require("assert");

const {HttpServer} = require("../../../modules/ringo/httpserver");
const httpClient = require("../../../modules/ringo/httpclient");
const fs = require("fs");

let server;

exports.tearDown = () => {
    server && server.stop() && server.destroy();
}

exports.testServeStatic = () => {
    server = new HttpServer();
    server.serveStatic("/static", fs.directory(module.path));

    const config = {
        host: "127.0.0.1",
        port: 4400
    };
    server.createHttpListener(config);
    server.start();
    const exchange = httpClient.get("http://" + config.host + ":" + config.port + "/static/" + fs.base(module.path));
    assert.strictEqual(exchange.status, 200);
    assert.strictEqual(exchange.content, fs.read(module.path));
};

if (require.main === module) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
