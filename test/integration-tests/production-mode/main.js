// Has to run in its own process with the --production option, see ../all.js
require('ringo/logging').setConfig(getResource('../../log4j2.properties'));

const assert = require("assert");
const engine = require("ringo/engine");
const httpClient = require("ringo/httpclient");
const {HttpServer} = require("ringo/httpserver");
const {HttpServlet} = Packages.jakarta.servlet.http;
const {ErrorHandler} = org.eclipse.jetty.server.handler;
const {JsgiServlet} = org.ringojs.jsgi;
const {ByteArrayOutputStream, PrintStream} = java.io;
const {System} = java.lang;

const BASE_URL = "http://localhost:8282";
const SECRET = "secret-error-detail";

const config = engine.getRhinoEngine().getConfig();
const originalErr = System.err;

let server = null;
let stderr = null;

const startServer = (app) => {
    server = new HttpServer();
    server.serveApplication("/", app).addServlet("/servlet", new HttpServlet({
        "service": () => {
            throw new Error(SECRET);
        }
    }));
    server.createHttpListener({
        host: "localhost",
        port: 8282
    });
    server.start();
};

const assertNoDetails = (content) => {
    assert.isFalse(content.includes(SECRET), "Error message exposed: " + content);
    assert.isFalse(content.includes(module.id), "Script path exposed: " + content);
    assert.isFalse(content.includes("Script Stack"), "Script stack exposed: " + content);
    assert.isFalse(content.includes("Exception"), "Exception exposed: " + content);
    assert.isFalse(content.includes("adapter"), "Servlet exposed: " + content);
};

const assertGenericErrorPage = (content) => {
    assert.isTrue(content.includes("<title>500 – Internal Server Error</title>"), content);
    assert.isTrue(content.includes("<h1>500 – Internal Server Error</h1>"), content);
    assert.isTrue(content.includes("<p>The server encountered an error and could not complete your request.</p>"), content);
};

exports.setUp = () => {
    stderr = new ByteArrayOutputStream();
    System.setErr(new PrintStream(stderr, true));
};

exports.tearDown = () => {
    System.setErr(originalErr);
    config.setProduction(true);
    if (server !== null) {
        server.stop();
        server.destroy();
        server = null;
    }
};

exports.testErrorPage = () => {
    startServer(() => {
        throw new Error(SECRET);
    });
    const exchange = httpClient.get(BASE_URL);
    assert.strictEqual(exchange.status, 500);
    assertGenericErrorPage(exchange.content);
    assertNoDetails(exchange.content);
    // operators still need the details
    assert.isTrue(stderr.toString().includes(SECRET));
    assert.isTrue(stderr.toString().includes(module.id));
};

exports.testErrorPageWithTemplateCharacters = () => {
    // the message broke the template rendering and ended up at the container
    startServer(() => {
        throw new Error("$5 " + SECRET);
    });
    const exchange = httpClient.get(BASE_URL);
    assert.strictEqual(exchange.status, 500);
    assertGenericErrorPage(exchange.content);
    assertNoDetails(exchange.content);
};

exports.testCommittedResponse = () => {
    startServer((request) => {
        const {servletResponse} = request.env;
        servletResponse.getOutputStream().print("partial");
        servletResponse.flushBuffer();
        throw new Error(SECRET);
    });
    let content = "";
    try {
        content = httpClient.get(BASE_URL).content;
    } catch (e) {
        // the connection gets aborted, so reading the body may fail
    }
    assertNoDetails(content);
    assert.isTrue(stderr.toString().includes(SECRET));
};

exports.testRenderingFailure = () => {
    server = new HttpServer();
    // like other servlet containers, the default handler renders exceptions
    server.jetty.setErrorHandler(new ErrorHandler());
    const servlet = new JavaAdapter(JsgiServlet, {
        "renderError": () => {
            throw new java.io.IOException("Rendering failed");
        }
    }, engine.getRhinoEngine(), () => {
        throw new Error(SECRET);
    });
    server.serveApplication("/", () => ({})).addServlet("/failing", servlet);
    server.createHttpListener({
        host: "localhost",
        port: 8282
    });
    server.start();

    const exchange = httpClient.get(BASE_URL + "/failing");
    assert.strictEqual(exchange.status, 500);
    assert.isFalse(exchange.content.includes(SECRET), exchange.content);
    assert.isTrue(stderr.toString().includes(SECRET));
};

exports.testContainerErrorPage = () => {
    startServer(() => ({status: 200, headers: {}, body: []}));
    ["text/html", "text/plain", "application/json"].forEach((accept) => {
        const exchange = httpClient.request({
            url: BASE_URL + "/servlet",
            headers: {"Accept": accept}
        });
        assert.strictEqual(exchange.status, 500);
        assert.isTrue(exchange.content.includes("Server Error"), exchange.content);
        assertNoDetails(exchange.content);
    });
};

exports.testDevelopmentMode = () => {
    config.setProduction(false);
    startServer(() => {
        throw new Error(SECRET);
    });
    const content = httpClient.get(BASE_URL).content;
    assert.isTrue(content.includes(SECRET));
    assert.isTrue(content.includes("Script Stack"));

    const servletContent = httpClient.get(BASE_URL + "/servlet").content;
    assert.isTrue(servletContent.includes(SECRET));
};

exports.testSandboxInheritsProductionMode = () => {
    const options = {systemModules: ["modules"]};
    assert.isTrue(engine.createSandbox([module.directory], {}, options).getConfig().isProduction());

    config.setProduction(false);
    assert.isFalse(engine.createSandbox([module.directory], {}, options).getConfig().isProduction());
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
