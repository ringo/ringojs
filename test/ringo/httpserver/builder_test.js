const system = require("system");
const assert = require("assert");

const {XmlConfiguration} = org.eclipse.jetty.xml;
const {ServerConnector} = org.eclipse.jetty.server;
const {ConnectionStatistics} = org.eclipse.jetty.io;
const {CrossOriginFilter, HeaderFilter} = org.eclipse.jetty.ee10.servlets;
const {SessionIdManager} = org.eclipse.jetty.session;

const Builder = require("../../../modules/ringo/httpserver/builder");
const HttpServer = require("../../../modules/ringo/httpserver/httpserver");
const ApplicationContext = require("../../../modules/ringo/httpserver/context/application");
const StaticContext = require("../../../modules/ringo/httpserver/context/static");

exports.testConstructor = () => {
    assert.isTrue(Builder() instanceof Builder);
    assert.isTrue(new Builder() instanceof Builder);
    const builder = new Builder();
    assert.isTrue(builder.server instanceof HttpServer);
    assert.isNull(builder.currentContext);
};

exports.testConfigure = () => {
    assert.throws(() => Builder().configure());
    assert.throws(() => Builder().configure("/non/existing"));
    const jettyXmlPath = module.resolve("../../../modules/config/jetty.xml");
    const builder = new Builder();
    assert.strictEqual(builder.configure(jettyXmlPath), builder);
    assert.isNotNull(builder.server.xmlConfig);
    assert.isTrue(builder.server.xmlConfig instanceof XmlConfiguration);
};

exports.testServeApplication = () => {
    const builder = new Builder();
    assert.throws(() => builder.serveApplication());
    assert.throws(() => builder.serveApplication("/"));
    assert.strictEqual(builder.serveApplication("/", () => {}), builder);
    assert.isNotNull(builder.currentContext);
    assert.isTrue(builder.currentContext instanceof ApplicationContext);
};

exports.testServeStatic = () => {
    const builder = new Builder();
    assert.throws(() => builder.serveStatic());
    assert.throws(() => builder.serveStatic("/"));
    assert.throws(() => builder.serveStatic("/", "/non/existing"));
    assert.strictEqual(builder.serveStatic("/", java.lang.System.getProperty("java.io.tmpdir")), builder);
    assert.isTrue(builder.currentContext instanceof StaticContext);
};

exports.testHttp = () => {
    const builder = new Builder();
    assert.strictEqual(builder.server.jetty.connectors.length, 0);
    assert.strictEqual(builder.http(), builder);
    assert.strictEqual(builder.server.jetty.connectors.length, 1);
    assert.isTrue(builder.server.jetty.connectors[0] instanceof ServerConnector);
};

exports.testHttps = () => {
    const builder = new Builder();
    assert.strictEqual(builder.server.jetty.connectors.length, 0);
    assert.strictEqual(builder.https(), builder);
    assert.strictEqual(builder.server.jetty.connectors.length, 1);
    assert.isTrue(builder.server.jetty.connectors[0] instanceof ServerConnector);
};

exports.testEnableSessions = () => {
    const builder = new Builder();
    assert.isNull(builder.server.jetty.getBean(SessionIdManager));
    assert.strictEqual(builder.enableSessions(), builder);
    assert.isNotNull(builder.server.jetty.getBean(SessionIdManager));
};

exports.testEnableConnectionStatistics = () => {
    const builder = new Builder();
    assert.strictEqual(builder.server.jetty.connectors.length, 0);
    builder.http().https().serveApplication("/", () => {});
    assert.strictEqual(builder.server.jetty.connectors.length, 2);
    Array.from(builder.server.jetty.connectors).forEach(connector => {
        assert.isNull(connector.getBean(ConnectionStatistics));
    });
    assert.strictEqual(builder.enableConnectionStatistics(), builder);
    Array.from(builder.server.jetty.connectors).forEach(connector => {
        assert.isNotNull(connector.getBean(ConnectionStatistics));
    });
};

exports.testAddWebSocket = () => {
    const builder = new Builder();
    // throws because there's no current application context
    assert.throws(() => builder.addWebSocket("/"));
    builder.serveStatic("/static", java.lang.System.getProperty("java.io.tmpdir"));
    // websockets can only be added to application contexts
    assert.throws(() => builder.addWebSocket("/"));
    builder.serveApplication("/", () => {});
    const {servletHandler} = builder.currentContext.contextHandler;
    assert.strictEqual(servletHandler.servlets.length, 1);
    assert.strictEqual(builder.addWebSocket("/"), builder);
    // afais there's no way to check if a websocket servlet has been set up,
    // thus only check if the number of servlets changed
    assert.strictEqual(servletHandler.servlets.length, 2);
};

exports.testAddEventSource = () => {
    const builder = new Builder();
    // throws because there's no current application context
    assert.throws(() => builder.addEventSource("/"));
    builder.serveStatic("/static", java.lang.System.getProperty("java.io.tmpdir"));
    // eventsource can only be added to application contexts
    assert.throws(() => builder.addEventSource("/"));
    builder.serveApplication("/", () => {});
    const {servletHandler} = builder.currentContext.contextHandler;
    assert.strictEqual(servletHandler.servlets.length, 1);
    assert.strictEqual(builder.addEventSource("/"), builder);
    // afais there's no way to check if there really has been set up,
    // thus only check if the number of servlets changed
    assert.strictEqual(servletHandler.servlets.length, 2);
};

exports.testAddFilter = () => {
    const builder = new Builder();
    // throws because there's no current context
    assert.throws(() => builder.addFilter());

    // filters can be added to application and static contexts
    builder.serveStatic("/static", java.lang.System.getProperty("java.io.tmpdir"));
    let {servletHandler} = builder.currentContext.contextHandler;
    assert.strictEqual(servletHandler.filters.length, 0);
    assert.strictEqual(builder.addFilter("/static/*.json", new CrossOriginFilter()), builder);
    assert.strictEqual(servletHandler.filters.length, 1);
    assert.isTrue(servletHandler.filters[0].heldClass.equals(CrossOriginFilter));

    builder.serveApplication("/", () => {});
    servletHandler = builder.currentContext.contextHandler.servletHandler;
    assert.strictEqual(servletHandler.filters.length, 0);
    assert.strictEqual(builder.addFilter("/", new HeaderFilter()), builder);
    assert.strictEqual(servletHandler.filters.length, 1);
    assert.isTrue(servletHandler.filters[0].heldClass.equals(HeaderFilter));
};

if (require.main === module) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
