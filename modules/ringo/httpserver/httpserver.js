/**
 * @fileoverview A module containing the HttpServer constructor and
 * its more lowlevel methods
 * @see <a href="../index/index.html#build">build()</a> for easier configuration
 */
const log = require('ringo/logging').getLogger(module.id);
const {XmlConfiguration} = org.eclipse.jetty.xml;
const {PathResourceFactory} = org.eclipse.jetty.util.resource;
const {Server, HttpConfiguration, HttpConnectionFactory,
        ServerConnector, SslConnectionFactory,
        SecureRequestCustomizer, Handler} = org.eclipse.jetty.server;
const {ContextHandlerCollection, DefaultHandler} = org.eclipse.jetty.server.handler;
const {ConnectionStatistics} = org.eclipse.jetty.io;
const {HttpVersion, HttpCookie} = org.eclipse.jetty.http;
const {DefaultSessionIdManager, HouseKeeper} = org.eclipse.jetty.session;
const {SslContextFactory} = org.eclipse.jetty.util.ssl;
const {Long} = java.lang;
const objects = require("ringo/utils/objects");
const ApplicationContext = require("./context/application");
const StaticContext = require("./context/static");
const {Paths, Files} = java.nio.file;

/**
 * HttpServer constructor
 * @name HttpServer
 * @see <a href="../index/index.html#build">build()</a>
 * @constructor
 */
const HttpServer = module.exports = function HttpServer(options) {
    if (!(this instanceof HttpServer)) {
        return new HttpServer(options);
    }

    const jetty = new Server();
    jetty.setDefaultHandler(new DefaultHandler());

    let xmlConfig = null;

    Object.defineProperties(this, {
        "jetty": {
            "value": jetty,
            "enumerable": true
        },
        "xmlConfig": {
            "get": function() {
                return xmlConfig;
            },
            "set": function(config) {
                if (!(config instanceof XmlConfiguration)) {
                    throw new Error("Invalid jetty xml configuration");
                }
                xmlConfig = config;
                xmlConfig.configure(jetty);
            },
            "enumerable": true
        },
        "contexts": {
            "value": {},
            "enumerable": true
        }
    });

    if (options !== null && options !== undefined) {
        if (typeof(options) === "string") {
            // path to jetty xml configuration
            this.configure(options);
        } else if (typeof(options) === "object" && options.constructor === Object) {
            jetty.setStopAtShutdown(options.stopAtShutdown !== false);
            jetty.setStopTimeout(options.stopTimeout || 1000);
            jetty.setDumpAfterStart(options.dumpAfterStart === true);
            jetty.setDumpBeforeStop(options.dumpBeforeStop === true);
        }
    }
    return this;
};

/** @ignore */
HttpServer.prototype.toString = function() {
    return "[HttpServer]";
};

/**
 * Configures this instance with the specified jetty.xml configuration file
 * @name HttpServer.instance.configure
 * @param {String} xmlPath The path to the jetty.xml configuration file
 */
HttpServer.prototype.configure = function(xmlPath) {
    const path = Paths.get(xmlPath);
    if (!Files.exists(path)) {
        throw Error('Jetty XML configuration "' + xmlPath + '" not found');
    }
    return this.xmlConfig = new XmlConfiguration(new PathResourceFactory().newResource(path));
};

/**
 * Creates a new HttpConfiguration instance
 * @name HttpServer.instance.createHttpConfig
 * @param {Object} options An object containing the following properties:
 * <ul>
 * <li>requestHeaderSize: (Number, default: 8129) The maximum size of request headers allowed</li>
 * <li>outputBufferSize: (Number, default: 32768) Sets the size of the buffer into which response content is aggregated before being sent to the client</li>
 * <li>responseHeaderSize: (Number, default: 8129) The maximum size of response headers</li>
 * <li>sendServerVersion: (boolean, default: false) Includes the Jetty server version in responses</li>
 * <li>sendDateHeader: (boolean, default: true) Enables/disables <em>Date</em> header in responses</li>
 * <li>secureScheme: (String, default: "https") Defines the URI scheme used for confidential and integral redirections</li>
 * </ul>
 *
 * @returns {org.eclipse.jetty.server.HttpConfiguration}
 */
HttpServer.prototype.createHttpConfig = function(options) {
    options = objects.merge(options || {}, {
        "requestHeaderSize": 8129,
        "outputBufferSize": 32768,
        "responseHeaderSize": 8129,
        "secureScheme": "https"
    });
    const httpConfig = new HttpConfiguration();
    httpConfig.setRequestHeaderSize(options.requestHeaderSize);
    httpConfig.setOutputBufferSize(options.outputBufferSize);
    httpConfig.setResponseHeaderSize(options.responseHeaderSize);
    httpConfig.setSecureScheme(options.secureScheme);
    httpConfig.setSendServerVersion(options.sendServerVersion === true);
    httpConfig.setSendDateHeader(options.sendDateHeader !== false);
    return httpConfig;
};

/**
 * Creates a new connector
 * @name HttpServer.instance.createConnector
 * @param {o.e.j.s.HttpConnectionFactory} connectionFactory The connection factory
 * @param {Object} options An object containing the following properties:
 * <ul>
 * <li>host: (String) </li>
 * <li>port: (Number)</li>
 * <li>name: (String) Optional connector name</li>
 * <li>idleTimeout: (Number, defaults to 30000 millis)</li>
 * <li>acceptorPriorityDelta: (Number, defaults to 0)</li>
 * <li>acceptQueueSize: (Number, defaults to 0)</li>
 * </ul>
 * @returns org.eclipse.jetty.server.ServerConnector
 */
HttpServer.prototype.createConnector = function(connectionFactory, options) {
    const connector = new ServerConnector(this.jetty, options.acceptors || -1,
            options.selectors || -1, connectionFactory);
    connector.setHost(options.host);
    connector.setPort(options.port);
    connector.setIdleTimeout(options.idleTimeout || 30000);
    connector.setAcceptorPriorityDelta(options.acceptorPriorityDelta || 0);
    connector.setAcceptQueueSize(options.acceptQueueSize || 0);
    if (typeof(options.name) === "string") {
        connector.setName(options.name);
    }
    return connector;
};

/**
 * Creates a new http connector
 * @name HttpServer.instance.createHttpConnector
 * @param {Object} options An object containing options
 * @see <a href="#createConnector">createConnector</a>
 * @returns org.eclipse.jetty.server.ServerConnector
 */
HttpServer.prototype.createHttpConnector = function(options) {
    options = objects.merge(options || {}, {
        "host": "0.0.0.0",
        "port": 8080
    });
    const httpConfig = this.createHttpConfig(options);
    const connectionFactory = new HttpConnectionFactory(httpConfig);
    return this.createConnector(connectionFactory, options);
};

/**
 * Creates a new SSL context factory
 * @name HttpServer.instance.createSslContextFactory
 * @param {Object} options An object containing options (in addition to those
 * passed to <a href="#createConnector">createConnector</a>):
 * <ul>
 * <li>verbose: (boolean, default: false) Dump the SSL configuration at startup</li>
 * <li>keyStore: (String) The path to the key store</li>
 * <li>keyStoreType: (String, default: "JKS") The type of keystore</li>
 * <li>keyStorePassword: (String) The key store password</li>
 * <li>keyManagerPassword: (String) The key manager password</li>
 * <li>trustStore: (String, default: options.keyStore) The path to an optional trust store</li>
 * <li>trustStorePassword: (String, default: options.keysStorePassword) The password of the optional trust store</li>
 * <li>includeCipherSuites: (Array, default: []) An array of cipher suites to enable</li>
 * <li>excludeCipherSuites: (Array, default: ["^SSL_.*", "^TLS_DHE_.*", "TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA", "TLS_ECDH_RSA_WITH_3DES_EDE_CBC_SHA"]) An array of cipher suites to disable</li>
 * <li>includeProtocols: (Array, default: ["TLSv1.2"]) An array containing protocols to support</li>
 * <li>excludeProtocols: (Array, default: null) An array of protocols to exclude</li>
 * <li>allowRenegotiation: (boolean, default: false) Enables TLS renegotiation</li>
 * </ul>
 * @see <a href="#createConnector">createConnector</a>
 * @returns org.eclipse.jetty.util.ssl.SslContextFactory;
 */
HttpServer.prototype.createSslContextFactory = function(options) {
    options = objects.merge(options || {}, {
        "verbose": false,
        "includeCipherSuites": [],
        "excludeCipherSuites": [
            "^SSL_.*",
            "^TLS_DHE_.*",
            "TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA",
            "TLS_ECDH_RSA_WITH_3DES_EDE_CBC_SHA"
        ],
        "includeProtocols": ["TLSv1.2"]
    });
    const sslContextFactory = new SslContextFactory.Server();
    if (typeof options.keyStore === "string") {
        sslContextFactory.setKeyStorePath(options.keyStore || null);
        sslContextFactory.setKeyStorePassword(options.keyStorePassword || null);
        if (typeof options.keyStoreType === "string") {
            sslContextFactory.setKeyStoreType(options.keyStoreType);
        }
    }
    sslContextFactory.setKeyManagerPassword(options.keyManagerPassword || null);
    if (typeof options.trustStore === "string") {
        sslContextFactory.setTrustStorePath(options.trustStore || options.keyStore || null);
        sslContextFactory.setTrustStorePassword(options.trustStorePassword ||
            options.keyStorePassword || null);
    }
    sslContextFactory.setIncludeCipherSuites(options.includeCipherSuites);
    sslContextFactory.setExcludeCipherSuites(options.excludeCipherSuites);
    sslContextFactory.setIncludeProtocols(options.includeProtocols);
    if (Array.isArray(options.excludeProtocols)) {
        sslContextFactory.setExcludeProtocols(options.excludeProtocols);
    }
    sslContextFactory.setRenegotiationAllowed(options.allowRenegotiation === true);
    if (options.verbose === true) {
        log.info(sslContextFactory.dump());
    }
    return sslContextFactory;
};

/**
 * Creates a new https connector
 * @name HttpServer.instance.createHttpsConnector
 * @param {Object} options An object containing options (in addition to those
 * passed to <a href="#createSslContextFactory">createSslContextFactory</a>):
 * <ul>
 * <li>sniHostCheck: (boolean, default: true) If true the SNI Host name must match when there is an SNI certificate.</li>
 * <li>stsMaxAgeSeconds: (Number, default: -1) The max age in seconds for a Strict-Transport-Security response header (-1 means no header is sent)</li>
 * <li>stsIncludeSubdomains: (boolean, default: false) If true a include subdomain property is sent with any Strict-Transport-Security header</li>
 * </ul>
 * @see <a href="#createSslContextFactory">createSslContextFactory</a>
 * @see <a href="#createConnector">createConnector</a>
 * @returns org.eclipse.jetty.server.ServerConnector
 */
HttpServer.prototype.createHttpsConnector = function(options) {
    options = objects.merge(options || {}, {
        "host": "0.0.0.0",
        "port": 8443,
        "sniHostCheck": true,
        "stsMaxAgeSeconds": -1,
        "stsIncludeSubdomains": false
    });
    const sslContextFactory = this.createSslContextFactory(options);
    const sslConnectionFactory = new SslConnectionFactory(sslContextFactory,
            HttpVersion.HTTP_1_1.toString());
    const httpsConfig = this.createHttpConfig(options);
    const customizer = new SecureRequestCustomizer();
    customizer.setSniHostCheck(options.sniHostCheck === true);
    if (!isNaN(options.stsMaxAgeSeconds)) {
        customizer.setStsMaxAge(options.stsMaxAgeSeconds);
    }
    customizer.setStsIncludeSubDomains(options.stsIncludeSubdomains === true);
    httpsConfig.addCustomizer(customizer);
    const httpConnectionFactory = new HttpConnectionFactory(httpsConfig);
    return this.createConnector([sslConnectionFactory, httpConnectionFactory], options);
};

/**
 * Creates a new http listener and adds it to the encapsulated jetty http server
 * @name HttpServer.instance.createHttpListener
 * @param {Object} options see <a href="#createHttpConnector">createHttpConnector</a>
 * @returns {org.eclipse.jetty.server.ServerConnector}
 */
HttpServer.prototype.createHttpListener = function(options) {
    const connector = this.createHttpConnector(options);
    this.jetty.addConnector(connector);
    return connector;
};

/**
 * Creates a new http listener and adds it to the encapsulated jetty http server
 * @name HttpServer.instance.createHttpsListener
 * @param {Object} options see <a href="#createHttpsConnector">createHttpsConnector</a>
 * @returns {org.eclipse.jetty.server.ServerConnector}
 */
HttpServer.prototype.createHttpsListener = function(options) {
    const connector = this.createHttpsConnector(options);
    this.jetty.addConnector(connector);
    return connector;
};

/**
 * Returns the handler collection of the encapsulated jetty server, instantiating
 * it if it doesn't exist already
 * @name HttpServer.instance.getHandlerCollection
 * @returns {org.eclipse.jetty.server.handler.HandlerCollection};
 */
HttpServer.prototype.getHandlerCollection = function() {
    let handlerCollection = this.jetty.getHandler();
    if (handlerCollection === null) {
        handlerCollection = new Handler.Sequence();
        this.jetty.setHandler(handlerCollection);
    }
    return handlerCollection;
};

/**
 * Returns the context handler collection of the encapsulated jetty server,
 * instantiating it if it doesn't exist already
 * @name HttpServer.instance.getContextHandlerCollection
 * @returns {org.eclipse.jetty.server.handler.ContextHandlerCollection};
 */
HttpServer.prototype.getContextHandlerCollection = function() {
    const handlerCollection = this.getHandlerCollection();
    let contextHandlerCollection =
            handlerCollection.getDescendant(ContextHandlerCollection);
    if (contextHandlerCollection === null) {
        contextHandlerCollection = new ContextHandlerCollection();
        prependHandler(contextHandlerCollection, handlerCollection);
    }
    return contextHandlerCollection;
};

function prependHandler(handler, handlers) {
    if (handler == null || handlers == null) {
        return;
    }
    const existing = handlers.getHandlers();
    const children = [handler].concat(existing);
    handlers.setHandlers(children);
}

/**
 * Adds a context and starts it
 * @name HttpServer.instance.addContext
 * @param {Context} context The context to add
 * @returns {Context} The context passed as argument
 */
HttpServer.prototype.addContext = function(context) {
    this.contexts[context.getKey()] = context;
    if (this.jetty.isRunning()) {
        context.contextHandler.start();
    }
    return context;
};

/**
 * Enables sessions in the jetty server
 * @name HttpServer.instance.enableSessions
 * @params {Object} options An object containing options
 * @see <a href="../builder/index.html#HttpServerBuilder.prototype.enableSessions">HttpServerBuilder.enableSessions()</a>
 * @returns {org.eclipse.jetty.server.session.DefaultSessionIdManager}
 */
HttpServer.prototype.enableSessions = function(options) {
    options || (options = {});

    // if random is null, jetty will fall back to a SecureRandom in its initRandom()
    const sessionIdManager = new DefaultSessionIdManager(this.jetty, options.random || null);
    sessionIdManager.setWorkerName(options.name || "node1");

    let houseKeeper = new HouseKeeper();
    houseKeeper.setSessionIdManager(sessionIdManager);
    houseKeeper.setIntervalSec(new Long(600));
    sessionIdManager.setSessionHouseKeeper(houseKeeper);

    this.jetty.addBean(sessionIdManager);
    return sessionIdManager;
};
/**
 * @name HttpServer.instance.serveApplication
 * @see <a href="../builder/index.html#HttpServerBuilder.prototype.serveApplication">HttpServerBuilder.serveApplication()</a>
 * @returns {Context}
 */
HttpServer.prototype.serveApplication = function(mountpoint, app, options) {
    if (typeof(mountpoint) !== "string") {
        throw new Error("Missing mountpoint argument");
    }
    options || (options = {});
    if (typeof(options.sameSiteCookies) === "string") {
        options.sameSiteCookies = options.sameSiteCookies.toUpperCase();
        const allowedValues = Array.from(HttpCookie.SameSite.values()).map(value => value.toString());
        if (!allowedValues.includes(options.sameSiteCookies)) {
            throw new Error("Invalid sameSiteCookies option, must be one of " + allowedValues.join(", "));
        }
    }
    options = {
        "security": options.security !== false,
        "sessions": options.sessions !== false,
        "sessionsMaxInactiveInterval": options.sessionsMaxInactiveInterval || null,
        "cookieName": options.cookieName || null,
        "cookieDomain": options.cookieDomain || null,
        "cookiePath": options.cookiePath || null,
        "cookieMaxAge": options.cookieMaxAge || -1,
        "httpOnlyCookies": options.httpOnlyCookies !== false,
        "secureCookies": options.secureCookies === true,
        "sameSiteCookies": options.sameSiteCookies || null,
        "statistics": options.statistics === true,
        "virtualHosts": options.virtualHosts
    };
    const parentContainer = this.getContextHandlerCollection();
    const context = new ApplicationContext(this.jetty, parentContainer, mountpoint, options);
    context.serve(app);
    return this.addContext(context);
};

/**
 * @name HttpServer.instance.serveStatic
 * @see <a href="../builder/index.html#HttpServerBuilder.prototype.serveStatic">HttpServerBuilder.serveStatic()</a>
 * @returns {Context}
 */
HttpServer.prototype.serveStatic = function(mountpoint, directory, options) {
    if (typeof(mountpoint) !== "string") {
        throw new Error("Missing mountpoint argument");
    }
    if (typeof(directory) !== "string") {
        throw new Error("Missing directory argument");
    }
    const path = Paths.get(directory);
    if (!Files.exists(path) || !Files.isDirectory(path)) {
        throw new Error("Directory '" + directory + "' doesn't exist or is not a directory");
    }
    options || (options = {});
    const initParameters = {
        "acceptRanges": options.acceptRanges === true,
        "dirAllowed": options.allowDirectoryListing === true,
        "gzip": options.gzip === true,
        "stylesheet": options.stylesheet || null,
        "etags": options.etags !== false,
        "maxCacheSize": options.maxCacheSize || 0,
        "maxCachedFileSize": options.maxCachedFileSize || 0,
        "maxCachedFiles": options.maxCachedFiles || 0,
        "cacheControl": options.cacheControl || null,
        "otherGzipFileExtensions": options.gzipExtensions || null
    };
    const parentContainer = this.getContextHandlerCollection();
    const context = new StaticContext(this.jetty, parentContainer, mountpoint, {
            "security": options.security === true,
            "sessions": options.sessions === true,
            "sessionsMaxInactiveInterval": options.sessionsMaxInactiveInterval || null,
            "cookieName": options.cookieName || null,
            "cookieDomain": options.cookieDomain || null,
            "cookiePath": options.cookiePath || null,
            "cookieMaxAge": options.cookieMaxAge || -1,
            "httpOnlyCookies": options.httpOnlyCookies !== false,
            "secureCookies": options.secureCookies === true,
            "sameSiteCookies": options.sameSiteCookies || null,
            "statistics": options.statistics === true,
            "virtualHosts": options.virtualHosts
        });
    context.serve(directory, initParameters);
    return this.addContext(context);
};

/**
 * @name HttpServer.instance.enableConnectionStatistics
 * @see <a href="../builder/index.html#HttpServerBuilder.prototype.enableConnectionStatistics">HttpServerBuilder.enableConnectionStatistics()</a>
 */
HttpServer.prototype.enableConnectionStatistics = function() {
    this.jetty.addBeanToAllConnectors(new ConnectionStatistics());
};

/**
 * Returns the connection statistics of the jetty server
 * @name HttpServer.instance.getConnectionStatistics
 * @returns {Object} An object containing connection statistics
 */
HttpServer.prototype.getConnectionStatistics = function() {
    let connectors = this.jetty.getConnectors();
    return connectors.map(function(connector) {
        return {
            "name": connector.getName(),
            "host": connector.getHost(),
            "port": connector.getPort(),
            "statistics": connector.getBean(ConnectionStatistics)
        }
    });
};

/**
 * Starts the jetty http server
 * @name HttpServer.instance.start
 */
HttpServer.prototype.start = function() {
    this.jetty.start();
    this.jetty.getConnectors().forEach(function(connector) {
        log.info("Server on {}:{} started", connector.getHost(), connector.getPort());
    });
};

/**
 * Stops the jetty http server
 * @name HttpServer.instance.stop
 */
HttpServer.prototype.stop = function() {
    return this.jetty.stop();
};

/**
 * Destroys the jetty http server
 * @name HttpServer.instance.destroy
 */
HttpServer.prototype.destroy = function() {
    return this.jetty.destroy();
};

/**
 * Returns true if the server is running
 * @name HttpServer.instance.isRunning
 * @returns {boolean} True if the server is running
 */
HttpServer.prototype.isRunning = function() {
    return this.jetty.isRunning();
};
