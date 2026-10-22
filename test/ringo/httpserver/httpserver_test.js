const system = require("system");
const assert = require("assert");

const {XmlConfiguration} = org.eclipse.jetty.xml;
const {HttpConfiguration, HttpConnectionFactory} = org.eclipse.jetty.server;
const {SslContextFactory} = org.eclipse.jetty.util.ssl;
const {HttpCookie} = org.eclipse.jetty.http;
const {Paths} = java.nio.file;

const HttpServer = require("../../../modules/ringo/httpserver/httpserver");

let httpServer;

exports.tearDown = () => {
    if (httpServer) {
        try {
            httpServer.stop();
        } catch (ignore) {
            // ignore
        } finally {
            httpServer.destroy();
        }
    }
};

exports.testConstructorNoArgs = () => {
    httpServer = new HttpServer();
    assert.isTrue(httpServer instanceof HttpServer);
    assert.isTrue(httpServer.hasOwnProperty("jetty"));
    assert.isNull(httpServer.xmlConfig);
    assert.strictEqual(Object.keys(httpServer.contexts).length, 0);
};

exports.testConstructorJettyXml = () => {
    assert.throws(() => new HttpServer("/non/existing"));
    const jettyXmlPath = module.resolve("../../../modules/config/jetty.xml");
    httpServer = new HttpServer(jettyXmlPath);
    assert.isNotNull(httpServer.xmlConfig);
    assert.isTrue(httpServer.xmlConfig instanceof XmlConfiguration);
    httpServer.destroy();
    httpServer = new HttpServer(jettyXmlPath);
    assert.throws(() => httpServer.configure("/non/existing"));
    const xmlConfig = httpServer.configure(jettyXmlPath);
    assert.isTrue(xmlConfig instanceof XmlConfiguration);
    assert.strictEqual(xmlConfig, httpServer.xmlConfig);
};

exports.testCreateHttpConfig = () => {
    const props = {
        requestHeaderSize: {
            values: [1024],
            defaultValue: 8129
        },
        outputBufferSize: {
            values: [1024],
            defaultValue: 32768
        },
        responseHeaderSize: {
            values: [1024],
            defaultValue: 8129
        },
        secureScheme: {
            values: ["tls"],
            defaultValue: "https"
        },
        sendServerVersion: {
            values: [true],
            defaultValue: false
        },
        sendDateHeader: {
            values: [false],
            defaultValue: true
        }
    }
    httpServer = new HttpServer();
    const options = {};
    Object.keys(props).forEach(name => {
        const {values, defaultValue} = props[name];
        const httpConfiguration = httpServer.createHttpConfig(options);
        assert.strictEqual(httpConfiguration[name], defaultValue, name + " (default)");
        values.forEach(value => {
            options[name] = value;
            const httpConfiguration = httpServer.createHttpConfig(options);
            assert.strictEqual(httpConfiguration[name], value, name);
        });
    });

};

exports.testConstructorOptions = () => {
    const props = {
        stopAtShutdown: {
            values: [true, false, undefined],
            defaultValue: true
        },
        stopTimeout: {
            values: [2000, 500, undefined],
            defaultValue: 1000
        },
        dumpAfterStart: {
            values: [true, false, undefined],
            defaultValue: false
        },
        dumpBeforeStop: {
            values: [true, false, undefined],
            defaultValue: false
        }
    }
    const options = {};
    Object.keys(props).forEach(name => {
        const {values, defaultValue} = props[name];
        values.forEach(value => {
            options[name] = value;
            const httpServer = new HttpServer(options);
            assert.isTrue([value, defaultValue].includes(httpServer.jetty[name]), name);
            httpServer.destroy();
        });
    });
};

exports.testCreateConnector = () => {
    const httpConfig = new HttpConfiguration();
    const connectionFactory = new HttpConnectionFactory(httpConfig);
    httpServer = new HttpServer();
    const invalid = [
        undefined, null, {},
        {host: null},
        {host: "0.0.0.256"},
        {host: "0.0.0.0", port: null}
    ];
    invalid.forEach(options => {
        assert.throws(() => httpServer.createConnector(connectionFactory, options));
    });
    const options = {
        host: "127.0.0.1",
        port: 8080,
        name: "testconnector"
    };
    let connector = httpServer.createConnector(connectionFactory, options);
    assert.strictEqual(connector.host, options.host);
    assert.strictEqual(connector.port, options.port);
    // defaults
    assert.strictEqual(connector.idleTimeout, 30000, "idleTimeout");
    assert.strictEqual(connector.acceptorPriorityDelta, 0, "acceptorPriorityDelta");
    assert.strictEqual(connector.acceptQueueSize, 0, "acceptQueueSize");
    assert.strictEqual(connector.name, options.name, "name");
};

exports.testCreateHttpConnector = () => {
    httpServer = new HttpServer();
    const connector = httpServer.createHttpConnector();
    // defaults
    assert.strictEqual(connector.host, "0.0.0.0");
    assert.strictEqual(connector.port, 8080);
    assert.strictEqual(connector.idleTimeout, 30000, "idleTimeout");
    assert.strictEqual(connector.acceptorPriorityDelta, 0, "acceptorPriorityDelta");
    assert.strictEqual(connector.acceptQueueSize, 0, "acceptQueueSize");
};

exports.testCreateSslContextFactory = () => {
    httpServer = new HttpServer();
    let sslContextFactory = httpServer.createSslContextFactory();
    assert.isTrue(sslContextFactory instanceof SslContextFactory.Server);
    // defaults
    assert.isNull(sslContextFactory.keyStorePath);
    assert.isNull(sslContextFactory.trustStorePath);
    assert.strictEqual(sslContextFactory.keyStoreType, "PKCS12");
    assert.strictEqual(sslContextFactory.includeCipherSuites.length, 0);
    assert.deepEqual(Array.from(sslContextFactory.excludeCipherSuites), [
        "^SSL_.*",
        "^TLS_DHE_.*",
        "TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA",
        "TLS_ECDH_RSA_WITH_3DES_EDE_CBC_SHA"
    ]);
    assert.deepEqual(Array.from(sslContextFactory.includeProtocols), ["TLSv1.2"]);
    assert.deepEqual(Array.from(sslContextFactory.excludeProtocols), ["SSL","SSLv2","SSLv2Hello","SSLv3"]);
    assert.isFalse(sslContextFactory.renegotiationAllowed);
    const options = {
        keyStore: module.resolve("./testkeystorepath"),
        keyStorePassword: "secret",
        keyStoreType: "JKS",
        trustStore: module.resolve("./testtruststorepath"),
        trustStorePassword: "verysecret",
        allowRenegotiation: true
    }
    sslContextFactory = httpServer.createSslContextFactory(options);
    assert.strictEqual(sslContextFactory.keyStorePath, Paths.get(options.keyStore).toUri().toString());
    assert.strictEqual(sslContextFactory.keyStoreType, options.keyStoreType);
    assert.strictEqual(sslContextFactory.trustStorePath, Paths.get(options.trustStore).toUri().toString());
    assert.isTrue(sslContextFactory.renegotiationAllowed);
};

exports.testCreateHttpsConnector = () => {
    httpServer = new HttpServer();
    const connector = httpServer.createHttpsConnector();
    assert.strictEqual(connector.host, "0.0.0.0");
    assert.strictEqual(connector.port, 8443);
    assert.strictEqual(connector.idleTimeout, 30000, "idleTimeout");
    assert.strictEqual(connector.acceptorPriorityDelta, 0, "acceptorPriorityDelta");
    assert.strictEqual(connector.acceptQueueSize, 0, "acceptQueueSize");
};

exports.testServeApplication = () => {
    const app = () => {};
    let options = {};
    httpServer = new HttpServer();
    assert.throws(() => httpServer.serveApplication());

    // same-site cookie setting
    assert.throws(() => httpServer.serveApplication("/", app, {
        sameSiteCookies: "INVALID"
    }));
    Array.from(HttpCookie.SameSite.values()).forEach(value => {
        const httpServer = new HttpServer();
        try {
            options.sameSiteCookies = value.toString();
            const context = httpServer.serveApplication("/", app, options);
            assert.isTrue(context.contextHandler.sessionHandler.sameSite.equals(value));
        } finally {
            httpServer.destroy();
        }
    });

    // defaults
    let {contextHandler} = httpServer.serveApplication("/", app);
    assert.isTrue(contextHandler.virtualHosts.isEmpty());

    let {securityHandler, sessionHandler} = contextHandler;
    assert.isTrue(securityHandler.getClass().equals(contextHandler.defaultSecurityHandlerClass));
    assert.isNotNull(sessionHandler);
    assert.strictEqual(sessionHandler.maxInactiveInterval, -1);
    assert.isNull(sessionHandler.sameSite);

    let {sessionCookieConfig} = sessionHandler;
    assert.isTrue(sessionCookieConfig.httpOnly);
    assert.isFalse(sessionCookieConfig.secure);
    assert.strictEqual(sessionCookieConfig.name, "JSESSIONID");
    assert.isNull(sessionCookieConfig.domain);
    assert.isNull(sessionCookieConfig.path);
    assert.strictEqual(sessionCookieConfig.maxAge, -1);

    // invert defaults
    options = {
        security: false,
        sessions: false,
        statistics: true,
        virtualHosts: ["my.testapp.org", "test.ringojs.org"]
    };

    contextHandler = httpServer.serveApplication("/", app, options).contextHandler;
    assert.isNotNull(contextHandler.statisticsHandler);
    assert.isNotNull(contextHandler.virtualHosts);
    assert.deepEqual(Array.from(contextHandler.virtualHosts), options.virtualHosts);

    assert.isNull(contextHandler.securityHandler);
    assert.isNull(contextHandler.sessionHandler);

    // custom session cookie settings
    options = {
        sessions: true,
        cookieName: "test",
        cookieDomain: "example.com",
        cookiePath: "/test/path",
        cookieMaxAge: 300,
        httpOnlyCookies: false,
        secureCookies: true
    };

    contextHandler = httpServer.serveApplication("/", app, options).contextHandler;
    sessionCookieConfig = contextHandler.sessionHandler.sessionCookieConfig;
    assert.isFalse(sessionCookieConfig.httpOnly);
    assert.isTrue(sessionCookieConfig.secure);
    assert.strictEqual(sessionCookieConfig.name, options.cookieName);
    assert.strictEqual(sessionCookieConfig.domain, options.cookieDomain);
    assert.strictEqual(sessionCookieConfig.path, options.cookiePath);
    assert.strictEqual(sessionCookieConfig.maxAge, options.cookieMaxAge);
};

exports.testServeStatic = () => {
    httpServer = new HttpServer();
    // missing mountpoint/directory arguments
    assert.throws(() => httpServer.serveStatic());
    assert.throws(() => httpServer.serveStatic("/static"));
    assert.throws(() => httpServer.serveStatic("/static", "/non/existing"));

    // defaults
    const path = "/static";
    const directory = Paths.get(java.lang.System.getProperty("java.io.tmpdir"))
            .toRealPath().toString() + "/";

    let {contextHandler} = httpServer.serveStatic(path, directory);
    assert.strictEqual(contextHandler.getBaseResource().getPath().toUri().toString(), Paths.get(directory).toUri().toString());

    // static serving has no security/session handler by default
    assert.isNull(contextHandler.securityHandler);
    assert.isNull(contextHandler.sessionHandler);

    let {initParameters} = contextHandler.servletHandler.getServlets()[0];
    // init parameter values are strings
    assert.strictEqual(initParameters.get("acceptRanges"), "false");
    assert.strictEqual(initParameters.get("dirAllowed"), "false");
    assert.strictEqual(initParameters.get("gzip"), "false");
    assert.isNull(initParameters.get("stylesheet"));
    assert.strictEqual(initParameters.get("etags"), "true");
    assert.strictEqual(initParameters.get("maxCacheSize"), "0");
    assert.strictEqual(initParameters.get("maxCachedFileSize"), "0");
    assert.strictEqual(initParameters.get("maxCachedFiles"), "0");
    assert.isNull(initParameters.get("cacheControl"));
    assert.isNull(initParameters.get("otherGzipFileExtensions"));

    // custom options
    let options = {
        security: true,
        sessions: true,
        cookieName: "test",
        cookieDomain: "example.com",
        cookiePath: "/test/path",
        cookieMaxAge: 300,
        httpOnlyCookies: false,
        secureCookies: true,
        virtualHosts: ["static.ringojs.org"],
        acceptRanges: true,
        allowDirectoryListing: true,
        gzip: true,
        stylesheet: "styles.css",
        etags: false,
        maxCacheSize: 1,
        maxCachedFileSize: 2,
        maxCachedFiles: 3,
        cacheControl: "no-cache",
        gzipExtensions: "gzipped"
    }

    contextHandler = httpServer.serveStatic(path, directory, options).contextHandler;
    assert.isNotNull(contextHandler.securityHandler);
    assert.isNotNull(contextHandler.sessionHandler);

    let sessionCookieConfig = contextHandler.sessionHandler.sessionCookieConfig;
    assert.isFalse(sessionCookieConfig.httpOnly);
    assert.isTrue(sessionCookieConfig.secure);
    assert.strictEqual(sessionCookieConfig.name, options.cookieName);
    assert.strictEqual(sessionCookieConfig.domain, options.cookieDomain);
    assert.strictEqual(sessionCookieConfig.path, options.cookiePath);
    assert.strictEqual(sessionCookieConfig.maxAge, options.cookieMaxAge);
    assert.deepEqual(Array.from(contextHandler.virtualHosts), options.virtualHosts);

    initParameters = contextHandler.servletHandler.getServlets()[0].initParameters;
    assert.strictEqual(initParameters.get("acceptRanges"), options.acceptRanges.toString());
    assert.strictEqual(initParameters.get("dirAllowed"), options.allowDirectoryListing.toString());
    assert.strictEqual(initParameters.get("gzip"), options.gzip.toString());
    assert.strictEqual(initParameters.get("stylesheet"), options.stylesheet);
    assert.strictEqual(initParameters.get("etags"), options.etags.toString());
    assert.strictEqual(initParameters.get("maxCacheSize"), options.maxCacheSize.toString());
    assert.strictEqual(initParameters.get("maxCachedFileSize"), options.maxCachedFileSize.toString());
    assert.strictEqual(initParameters.get("maxCachedFiles"), options.maxCachedFiles.toString());
    assert.strictEqual(initParameters.get("cacheControl"), options.cacheControl);
    assert.strictEqual(initParameters.get("otherGzipFileExtensions"), options.gzipExtensions);
};

exports.testLifeCycle = () => {
    httpServer = new HttpServer();
    assert.isFalse(httpServer.isRunning());
    httpServer.start();
    assert.isTrue(httpServer.isRunning());
    httpServer.stop();
    assert.isFalse(httpServer.isRunning());
    httpServer.destroy();
    assert.throws(() => httpServer.start(), java.lang.IllegalStateException);
};

if (require.main === module) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
