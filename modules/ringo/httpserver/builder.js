/**
 * @fileoverview A module for configuring an http(s) server
 */

const HttpServer = require("./httpserver");

/**
 * HttpServerBuilder constructor
 * @name HttpServerBuilder
 * @params {String|Object} see <a href="./index.html#build">build()</a>
 * @see <a href="../index/index.html#build">build()</a>
 * @constructor
 */
const HttpServerBuilder = module.exports = function HttpServerBuilder(options) {
    if (!(this instanceof HttpServerBuilder)) {
        return new HttpServerBuilder(options);
    }
    Object.defineProperties(this, {
        "server": {
            "value": new HttpServer(options)
        },
        "currentContext": {
            "value": null,
            "writable": true
        }
    });
    return this;
};

/** @ignore */
HttpServerBuilder.prototype.toString = function() {
    return "[HttpServerBuilder]";
};

/**
 * Configures the HttpServer with the jetty.xml configuration file
 * @name HttpServerBuilder.instance.configure
 * @param {String} xmlPath The path to the jetty.xml configuration file
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.configure = function(xmlPath) {
    this.server.configure(xmlPath);
    return this;
};

/**
 * Configures the http server to serve an application at the specified mountpoint
 * @name HttpServerBuilder.instance.serveApplication
 * @param {String} mountpoint The mountpoint to server the application at
 * @param {String|Function} app The application to server. Can be defined either
 * as string specifying the application module to load, or as a function.
 * @param {Object} options An object containing the following options:
 * <ul>
 * <li>security: (boolean, default: true)</li>
 * <li>sessions: (boolean, default: true)</li>
 * <li>sessionsMaxInactiveInterval: (Number, default: null) </li>
 * <li>cookieName: (String, default: null)</li>
 * <li>cookieDomain: (String, default: null) The domain of session cookies</li>
 * <li>cookiePath: (String, default: null) The path of session cookies</li>
 * <li>cookieMaxAge: (Number, default: -1) The max age of session cookies, -1 means </li>
 * <li>httpOnlyCookies: (boolean, default: true) Enable/disables the HttpOnly flag of session cookies</li>
 * <li>secureCookies: (boolean, default: false) Enable/disables the Secure flag of session cookies</li>
 * <li>sameSiteCookies: (String, default: null) Sets the SameSite flag of session cookies. Possible values: "lax" (default of modern Browsers), "strict" or "none"</li>
 * <li>statistics: (boolean, default: false) Enable request statistics</li>
 * <li>virtualHosts: (String|Array) Virtual host(s) under which this application should be reachable</li>
 * <ul>
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.serveApplication = function(mountpoint, app, options) {
    this.currentContext = this.server.serveApplication(mountpoint, app, options);
    return this;
};

/**
 * Configures the http server to serve static files at the specified mountpoint
 * @name HttpServerBuilder.instance.serveStatic
 * @param {String} mountpoint The mountpoint to server the static files at
 * @param {String} directory The directory containing the static files
 * @param {Object} options An object containing the following options:
 * <ul>
 * <li>acceptRanges: (boolean, default: false) Enables range requests</li>
 * <li>allowDirectoryListing: (boolean, default: false) Enables directory listing</li>
 * <li>gzip: (boolean, default: false) Enables gzip compression</li>
 * <li>stylesheet: (String, default: null) The location to an optional stylesheet</li>
 * <li>etags: (boolean, default: true) Enables/disables ETag generation for static files</li>
 * <li>maxCacheSize: (Number, default: 0) The maximum total size of the cache (0 meaning no cache at all)</li>
 * <li>maxCachedFileSize: (Number, default: 0) The maximum size of a file to cache</li>
 * <li>maxCachedFiles: (Number, default: 0) The maximum number of files to cache</li>
 * <li>cacheControl: (String, default: null) If set, all files are served with this cache-control response header</li>
 * <li>gzipExtensions: (String, default: null) Other file extensions that signify that a file is already compressed, eg. ".svgz"</li>
 * </ul>
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.serveStatic = function(mountpoint, directory, options) {
    this.currentContext = this.server.serveStatic(mountpoint, directory, options);
    return this;
};

/**
 * Configures a HTTP listener with the specified options
 * @name HttpServerBuilder.instance.http
 * @param {Object} options An object containing the following options:
 * <ul>
 * <li>host: (String, default: "0.0.0.0") </li>
 * <li>port: (Number, default: 8080)</li>
 * <li>requestHeaderSize: (Number, default: 8129) The maximum size of request headers allowed</li>
 * <li>outputBufferSize: (Number, default: 32768) Sets the size of the buffer into which response content is aggregated before being sent to the client</li>
 * <li>responseHeaderSize: (Number, default: 8129) The maximum size of response headers</li>
 * <li>sendServerVersion: (boolean, default: false) Includes the Jetty server version in responses</li>
 * <li>sendDateHeader: (boolean, default: true) Enables/disables <em>Date</em> header in responses</li>
 * <li>secureScheme: (String, default: "https") Defines the URI scheme used for confidential and integral redirections</li>
 * </ul>
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.http = function(options) {
    this.server.createHttpListener(options);
    return this;
};

/**
 * Configures a HTTPS listener with the specified options
 * @name HttpServerBuilder.instance.https
 * @param {Object} options An object containing the following options:
 * <ul>
 * <li>host: (String, default: "0.0.0.0") </li>
 * <li>port: (Number, default: 8443)</li>
 * <li>sniHostCheck: (boolean, default: true) If true the SNI Host name must match when there is an SNI certificate.</li>
 * <li>stsMaxAgeSeconds: (Number, default: -1) The max age in seconds for a Strict-Transport-Security response header (-1 means no header is sent)</li>
 * <li>stsIncludeSubdomains: (boolean, default: false) If true a include subdomain property is sent with any Strict-Transport-Security header</li>
 * <li>requestHeaderSize: (Number, default: 8129) The maximum size of request headers allowed</li>
 * <li>outputBufferSize: (Number, default: 32768) Sets the size of the buffer into which response content is aggregated before being sent to the client</li>
 * <li>responseHeaderSize: (Number, default: 8129) The maximum size of response headers</li>
 * <li>sendServerVersion: (boolean, default: false) Includes the Jetty server version in responses</li>
 * <li>sendDateHeader: (boolean, default: true) Enables/disables <em>Date</em> header in responses</li>
 * <li>secureScheme: (String, default: "https") Defines the URI scheme used for confidential and integral redirections</li>
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
 *
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.https = function(options) {
    this.server.createHttpsListener(options);
    return this;
};

/**
 * Enables sessions with the specified options
 * @name HttpServerBuilder.instance.enableSessions
 * @param {Object} options An object containing the following options:
 * <ul>
 * <li>name: (String, default: "node1") The worker name that is appended to the session ID</li>
 * <li>random: (java.util.Random, default: null) A random number generator to use for session IDs</li>
 * </ul>
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.enableSessions = function(options) {
    this.server.enableSessions(options);
    return this;
};

/**
 * Enables statistics for all connectors
 * @name HttpServerBuilder.instance.enableConnectionStatistics
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.enableConnectionStatistics = function() {
    this.server.enableConnectionStatistics();
    return this;
};

/**
 * Starts the http server
 * @name HttpServerBuilder.instance.start
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.start = function() {
    this.server.start();
    return this;
};

/**
 * Adds a websocket connector to the current application context., which must have
 * been configured before.
 * @name HttpServerBuilder.instance.addWebSocket
 * @param {String} path The path of the websocket connector
 * @param {Function} onConnect An optional callback function invoked with the websocket and the session as arguments
 * @param {Function} onCreate An optional callback function invoked with the request and response objects
 * as arguments. If this callback returns a value other than true, the connection is aborted.
 * @param {Object} initParams An object containing servlet init parameters
 * (see <a href="https://www.eclipse.org/jetty/javadoc/current/org/eclipse/jetty/websocket/servlet/WebSocketServlet.html">org.eclipse.jetty.websocket.servlet.WebSocketServlet</a>
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.addWebSocket = function(path, onConnect, onCreate, initParams) {
    this.currentContext.addWebSocket(path, onConnect, onCreate, initParams);
    return this;
};

/**
 * Adds an EventSource connnector to the current application context, which must have
 * been configured before.
 * @name HttpServerBuilder.instance.addEventSource
 * @param {String} path The path of the EventSource connector
 * @param {Function} onConnect An optional callback function invoked with the EventSource
 * instance and the request object as arguments
 * @param {Object} initParams An object containing servlet init parameters
 * (see <a href="https://www.eclipse.org/jetty/javadoc/current/org/eclipse/jetty/servlets/EventSourceServlet.html">org.eclipse.jetty.servlets.EventSourceServlet</a>)
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.addEventSource = function(path, onConnect, initParams) {
    this.currentContext.addEventSource(path, onConnect, initParams);
    return this;
};

/**
 * Adds a servlet filter to the chain of the current application context, which must have
 * been configured before.
 * @name HttpServerBuilder.instance.addFilter
 * @param {String} path The path spec of this filter
 * @param {javax.servlet.Filter} filter The filter to add
 * @param {Object} initParams An object containing init parameters to pass to the <a href="https://www.eclipse.org/jetty/javadoc/current/org/eclipse/jetty/servlet/FilterHolder.html">org.eclipse.jetty.servlet.FilterHolder</a>
 * @returns {HttpServerBuilder}
 */
HttpServerBuilder.prototype.addFilter = function(path, filter, initParams) {
    this.currentContext.addFilter(path, filter, initParams);
    return this;
};
