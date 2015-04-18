/**
 * @fileOverview A wrapper for the Jetty HTTP server.
 */

var log = require('ringo/logging').getLogger(module.id);
var system = require('system');
var {JavaEventEmitter} = require('ringo/events');
var {WebSocketServlet, WebSocketCreator} = org.eclipse.jetty.websocket.servlet;
var {WebSocketListener} = org.eclipse.jetty.websocket.api;
var {EventSourceServlet} = org.eclipse.jetty.servlets;
var JettyEventSource = org.eclipse.jetty.servlets.EventSource;
var {ByteBuffer} = java.nio;

export('Server', 'main', 'init', 'start', 'stop', 'destroy');

var options,
    server,
    started = false;

var WebSocket = function() {
    this.session = null;

    // make WebSocket a java event-emitter (mixin)
    JavaEventEmitter.call(this, [WebSocketListener], {
        "onWebSocketConnect": "connect",
        "onWebSocketClose": "close",
        "onWebSocketText": "text",
        "onWebSocketBinary": "binary",
        "onWebSocketError": "error"
    });
    // these events are emitted for backwards compatibility
    this.addListener("connect", (function(session) {
        this.emit("open", session);
    }).bind(this));
    this.addListener("text", (function(message) {
        this.emit("message", message);
    }).bind(this));
    this.addListener("binary", (function(bytes, offset, length) {
        this.emit("message", bytes, offset, length);
    }).bind(this));

    return this;
};

/** @ignore */
WebSocket.prototype.toString = function() {
    return "[WebSocket]";
};

/**
 * Closes the WebSocket connection.
 * @name WebSocket.instance.close
 * @function
 */
WebSocket.prototype.close = function() {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    this.session.close();
    this.session = null;
};

/**
 * Send a string over the WebSocket.
 * @param {String} message a string
 * @name WebSocket.instance.send
 * @deprecated
 * @see #sendString
 * @function
 */
WebSocket.prototype.send = function(message) {
    return this.sendString(message);
};

/**
 * Send a string over the WebSocket. This method
 * blocks until the message has been transmitted
 * @param {String} message a string
 * @name WebSocket.instance.sendString
 * @function
 */
WebSocket.prototype.sendString = function(message) {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    this.session.getRemote().sendString(message);
};

/**
 * Send a string over the WebSocket. This method
 * does not wait until the message as been transmitted.
 * @param {String} message a string
 * @name WebSocket.instance.sendStringAsync
 * @function
 */
WebSocket.prototype.sendStringAsync = function(message) {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    return this.session.getRemote().sendStringByFuture(message);
};

/**
 * Send a byte array over the WebSocket. This method
 * blocks until the message as been transmitted.
 * @param {ByteArray} byteArray The byte array to send
 * @param {Number} offset Optional offset (defaults to zero)
 * @param {Number} length Optional length (defaults to the
 * length of the byte array)
 * @name WebSocket.instance.sendBinary
 * @function
 */
WebSocket.prototype.sendBinary = function(byteArray, offset, length) {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    var buffer = ByteBuffer.wrap(byteArray, parseInt(offset, 10) || 0,
        parseInt(length, 10) || byteArray.length);
    return this.session.getRemote().sendBytes(buffer);
};

/**
 * Send a byte array over the WebSocket. This method
 * does not wait until the message as been transmitted.
 * @param {ByteArray} byteArray The byte array to send
 * @param {Number} offset Optional offset (defaults to zero)
 * @param {Number} length Optional length (defaults to the
 * length of the byte array)
 * @name WebSocket.instance.sendBinaryAsync
 * @returns {java.util.concurrent.Future}
 * @function
 */
WebSocket.prototype.sendBinaryAsync = function(byteArray, offset, length) {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    var buffer = ByteBuffer.wrap(byteArray, parseInt(offset, 10) || 0,
            parseInt(length, 10) || byteArray.length);
    return this.session.getRemote().sendBytesByFuture(buffer);
};

/**
 * Check whether the WebSocket is open.
 * @name WebSocket.instance.isOpen
 * @return {Boolean} true if the connection is open
 * @function
 */
WebSocket.prototype.isOpen = function() {
    return this.session !== null && this.session.isOpen();
};

/**
 * EventSource is the active half of an event source connection, and allows
 * applications to operate on the connection by sending events, data or
 * comments, or by closing the connection.
 *
 * An EventSource instance will be created for each new event source connection.
 * EventSource instances are fully thread safe and can be used from multiple threads.
 *
 * An EventSource emits two events: "open" when the event source connection
 * is ready to be used. And "close" when the connection is closed.
 *
 * When trying to send over a closed connection, an exception is thrown.
 */
var EventSource = function() {
    this.emitter = null;
    JavaEventEmitter.call(this, [JettyEventSource]);

    this.addListener("open", (function(emitter) {
        this.emitter = emitter;
    }).bind(this));
    this.addListener("close", (function(emitter) {
        this.emitter = null;;
    }).bind(this));

    return this;
};

/**
 * Closes this event source connection.
 */
EventSource.prototype.close = function() {
    if (this.emitter == null) {
        throw new Error("EventSource connection not open.");
    }
    this.emitter.close();
};

/**
 * Sends a comment to the client.
 * When invoked as: comment("foo"), the client will receive the line:
 *     : foo
 * @param {String} comment the comment text to send
 */
EventSource.prototype.comment = function(comment) {
    if (this.emitter == null) {
        throw new Error("EventSource connection not open.");
    }
    this.emitter.comment(comment);
};

/**
 * Sends a default event with data to the client.
 * When invoked as: data("baz"), the client will receive the line:
 *     data: baz
 *
 * When invoked as: data("foo\r\nbar\rbaz\nbax"), the client will receive the lines:
 *     data: foo
 *     data: bar
 *     data: baz
 *     data: bax
 *
 * @param {String} data the data to send
 */
EventSource.prototype.data = function(data) {
    if (this.emitter == null) {
        throw new Error("EventSource connection not open.");
    }
    this.emitter.data(data);
};

/**
 * Sends a named event with data to the client.
 * When invoked as: event("foo", "bar"), the client will receive the lines:
 *
 *     event: foo
 *     data: bar
 * @param {String} name the name of the event
 * @param {String} data the data of the event
 */
EventSource.prototype.event = function(name, data) {
    if (this.emitter == null) {
        throw new Error("EventSource connection not open.");
    }
    this.emitter.event(name, data);
};

/**
 * Create a Jetty HTTP server with the given options. The options may
 * either define properties to be used with the default jetty.xml, or define
 * a custom configuration file.
 *
 * @param {Object} options A javascript object with any of the following
 * properties (default values in parentheses):
 *
 * <ul>
 * <li>jettyConfig ('config/jetty.xml')</li>
 * <li>port (8080)</li>
 * <li>host (undefined)</li>
 * <li>sessions (true)</li>
 * <li>security (true)</li>
 * <li>cookieName (null)</li>
 * <li>cookieDomain (null)</li>
 * <li>cookiePath (null)</li>
 * <li>httpOnlyCookies (false)</li>
 * <li>secureCookies (false)</li>
 * </ul>
 *
 * For convenience, the constructor supports the definition of a JSGI application
 * and static resource mapping in the options object using the following properties:
 *
 * <ul>
 * <li>virtualHost (undefined)</li>
 * <li>mountpoint ('/')</li>
 * <li>staticDir ('static')</li>
 * <li>staticMountpoint ('/static')</li>
 * <li>appModule ('main')</li>
 * <li>appName ('app')</li>
 * </ul>
 */
function Server(options) {

    if (!(this instanceof Server)) {
        return new Server(options);
    }

    // the jetty server instance
    var jetty;
    var defaultContext;
    var contextMap = {};
    var xmlconfig;

    /**
     * Get the server's default [context](#Context). The default context is the
     * context that is created when the server is created.
     * @see #Context
     * @since: 0.6
     * @returns {Context} the default Context
     */
    this.getDefaultContext = function() {
        return defaultContext;
    };

    /**
     * Get a servlet application [context](#Context) for the given path and
     * virtual hosts, creating it if it doesn't exist.
     * @param {String} path the context root path such as "/" or "/app"
     * @param {String|Array} virtualHosts optional single or multiple virtual host names.
     *   A virtual host may start with a "*." wildcard.
     * @param {Object} options may have the following properties:
     *   sessions: true to enable sessions for this context, false otherwise
     *   security: true to enable security for this context, false otherwise
     *   cookieName: optional cookie name
     *   cookieDomain: optional cookie domain
     *   cookiePath: optional cookie path
     *   httpOnlyCookies: true to enable http-only session cookies
     *   secureCookies: true to enable secure session cookies
     * @see #Context
     * @since: 0.6
     * @returns {Context} a Context object
     */
    this.getContext = function(path, virtualHosts, options) {
        var idMap = xmlconfig.getIdMap();
        options = options || {};
        var contextKey = virtualHosts ? String(virtualHosts) + path : path;
        var cx = contextMap[contextKey];
        if (!cx) {
            var contexts = idMap.get("Contexts");
            var sessions = Boolean(options.sessions);
            var security = Boolean(options.security);
            cx = new org.eclipse.jetty.servlet.ServletContextHandler(contexts, path, sessions, security);
            if (virtualHosts) {
                cx.setVirtualHosts(Array.isArray(virtualHosts) ? virtualHosts : [String(virtualHosts)]);
            }
            var sessionHandler = cx.getSessionHandler();
            if (sessionHandler != null) {
                var sessionCookieConfig = sessionHandler.getSessionManager().getSessionCookieConfig();
                sessionCookieConfig.setHttpOnly(options.httpOnlyCookies);
                sessionCookieConfig.setSecure(options.secureCookies);
                if (typeof(options.cookieName) === "string") {
                    sessionCookieConfig.setName(options.cookieName);
                }
                sessionCookieConfig.setDomain(options.cookieDomain);
                sessionCookieConfig.setPath(options.cookiePath);
            }
            contextMap[contextKey] = cx;
            if (jetty.isRunning()) {
                cx.start();
            }
        }

        /**
         * Not exported as constructor by this module.
         * @see #Server.prototype.getContext
         * @see #Server.prototype.getDefaultContext
         * @class Context
         * @name Context
         */
        return {
            /**
             * Returns the wrapped servlet context handler
             */
            getHandler: function() {
                return cx;
            },
            /**
             * Map this context to a JSGI application.
             * @param {Function|Object} app a JSGI application, either as a function
             *   or an object with properties <code>appModule</code> and
             *   <code>appName</code> defining the application.
             *   <div><code>{ appModule: 'main', appName: 'app' }</code></div>
             * @param {RhinoEngine} engine optional RhinoEngine instance for
             *   multi-engine setups
             * @since: 0.6
             * @name Context.instance.serveApplication
             */
            serveApplication: function(app, engine) {
                log.debug("Adding JSGI application:", cx, "->", app);
                engine = engine || require('ringo/engine').getRhinoEngine();
                var isFunction = typeof app === "function";
                var servlet = isFunction ?
                              new JsgiServlet(engine, app) :
                              new JsgiServlet(engine);
                var jpkg = org.eclipse.jetty.servlet;
                var servletHolder = new jpkg.ServletHolder(servlet);
                if (!isFunction) {
                    servletHolder.setInitParameter('app-module', app.appModule || 'main');
                    servletHolder.setInitParameter('app-name', app.appName || 'app');
                }
                cx.addServlet(servletHolder, "/*");
            },
            /**
             * Map this context to a directory containing static resources.
             * @param {String} dir the directory from which to serve static resources
             * @since: 0.6
             * @name Context.instance.serveStatic
             */
            serveStatic: function(dir) {
                log.debug("Adding static handler:", cx, "->", dir);
                var repo = getRepository(dir);
                cx.setResourceBase(repo.exists() ? repo.getPath() : dir);
                var jpkg = org.eclipse.jetty.servlet;
                var servletHolder = new jpkg.ServletHolder(jpkg.DefaultServlet);
                cx.addServlet(servletHolder, "/*");
            },
            /**
             * Map a request path within this context to the given servlet.
             * @param {String} servletPath the servlet path
             * @param {Servlet} servlet a java object implementing the
             *     javax.servlet.Servlet interface.
             * @param {Object} initParams optional object containing servlet
             *     init parameters
             * @since: 0.6
             * @name Context.instance.addServlet
             */
            addServlet: function(servletPath, servlet, initParams) {
                log.debug("Adding Servlet:", servletPath, "->", servlet);
                var jpkg = org.eclipse.jetty.servlet;
                var servletHolder = new jpkg.ServletHolder(servlet);
                for (var p in initParams) {
                    servletHolder.setInitParameter(p, initParams[p])
                }
                cx.addServlet(servletHolder, servletPath);
            },
            /**
             * Start accepting WebSocket connections in this context context.
             *
             * @param {String} path The URL path on which to accept WebSocket connections
             * @param {Function} onconnect a function called for each new WebSocket connection
             *        with the WebSocket object as argument.
             * @since 0.8
             * @see #WebSocket
             * @name Context.instance.addWebSocket
             */
            addWebSocket: function(path, onconnect) {
                log.info("Starting websocket support");

                var webSocketCreator = new WebSocketCreator({
                    "createWebSocket": function(request, response) {
                        var socket = new WebSocket();
                        socket.addListener("connect", function(session) {
                            socket.session = session;
                            if (typeof onconnect === "function") {
                                onconnect(socket, session);
                            }
                        });

                        return socket.impl;
                    }
                });

                this.addServlet(path, new WebSocketServlet({
                    "configure": function(factory) {
                        // factory.register(webSocketListener.impl);
                        factory.setCreator(webSocketCreator);
                    }
                }));
            },
            addEventSource: function(path, onconnect, initParams) {
                log.info("Starting eventsource support");
                this.addServlet(path, new EventSourceServlet({
                    newEventSource: function(request) {
                        var eventSource = new EventSource();
                        if (typeof onconnect === "function") {
                            onconnect(eventSource, request);
                        }
                        return eventSource.impl;
                    }
                }, initParams));
            }
        };
    };

    /**
     * Start the HTTP server.
     */
    this.start = function() {
        jetty.start();
        for each (let connector in jetty.getConnectors()) {
            log.info('Server on http://' + connector.getHost() + ':' +
                    connector.getPort() + ' started.');
        }
    };

    /**
     * Stop the HTTP server.
     */
    this.stop = function() {
        jetty.stop();
        contextMap = {};
    };

    /**
     * Destroy the HTTP server, freeing its resources.
     */
    this.destroy = function() {
        jetty.destroy();
    };

    /**
     * Checks whether this server is currently running.
     * @returns {Boolean} true if the server is running, false otherwise.
     */
    this.isRunning = function() {
        return jetty && jetty.isRunning();
    };

    /**
     * Get the Jetty server instance
     * @returns {org.eclipse.jetty.server.Server} the Jetty Server instance
     */
    this.getJetty = function() {
        return jetty;
    };

    options = options || {};

    var jettyFile = options.jettyConfig || 'config/jetty.xml';
    var jettyConfig = getResource(jettyFile);
    if (!jettyConfig.exists()) {
        throw Error('Resource "' + jettyFile + '" not found');
    }
    var XmlConfiguration = org.eclipse.jetty.xml.XmlConfiguration;
    var JsgiServlet = org.ringojs.jsgi.JsgiServlet;
    jetty = new org.eclipse.jetty.server.Server();
    xmlconfig = new XmlConfiguration(jettyConfig.inputStream);
    xmlconfig.configure(jetty);

    // create default context
    defaultContext = this.getContext(options.mountpoint || "/", options.virtualHost, {
        security: options.security !== false,
        sessions: options.sessions !== false,
        cookieName: options.cookieName || null,
        cookieDomain: options.cookieDomain || null,
        cookiePath: options.cookiePath || null,
        httpOnlyCookies: options.httpOnlyCookies === true,
        secureCookies: options.secureCookies === true
    });

    // If options defines an application mount it
    if (typeof options.app === "function") {
        defaultContext.serveApplication(options.app);
    } else if (options.appModule && options.appName) {
        defaultContext.serveApplication(options);
    }

    // Allow definition of app/static mappings in server config for convenience
    if (options.staticDir) {
        var files = require('ringo/utils/files');
        var staticContext = this.getContext(options.staticMountpoint || '/static', options.virtualHost);
        staticContext.serveStatic(files.resolveId(options.appModule, options.staticDir));
    }

    // Start listeners. This allows us to run on privileged port 80 under jsvc
    // even as non-root user if the constructor is called with root privileges
    // while start() is called with the user we will actually run as
    var connectors = jetty.getConnectors();
    for each (var connector in connectors) {
        connector.setHost(options.host || "localhost");
        connector.setPort(options.port || 8080);
        connector.open();
    }

}


function parseOptions(args, defaults) {
    // remove command from command line arguments
    var cmd = args.shift();
    var Parser = require('ringo/args').Parser;
    var parser = new Parser();

    parser.addOption("a", "app-name", "APP", "The exported property name of the JSGI app (default: 'app')");
    parser.addOption("j", "jetty-config", "PATH", "The jetty xml configuration file (default. 'config/jetty.xml')");
    parser.addOption("H", "host", "ADDRESS", "The IP address to bind to (default: 0.0.0.0)");
    parser.addOption("m", "mountpoint", "PATH", "The URI path where to mount the application (default: /)");
    parser.addOption("p", "port", "PORT", "The TCP port to listen on (default: 80)");
    parser.addOption("s", "static-dir", "DIR", "A directory with static resources to serve");
    parser.addOption("S", "static-mountpoint", "PATH", "The URI path where ot mount the static resources");
    parser.addOption("v", "virtual-host", "VHOST", "The virtual host name (default: undefined)");
    parser.addOption("h", "help", null, "Print help message to stdout");

    var options = parser.parse(args, defaults);

    if (options.port && !isFinite(options.port)) {
        var port = parseInt(options.port, 10);
        if (isNaN(port) || port < 1) {
            throw "Invalid value for port: " + options.port;
        }
        options.port = port;
    }

    if (options.help) {
        print("Usage:");
        print("", cmd, "[OPTIONS]", "[PATH]");
        print("Options:");
        print(parser.help());
        system.exit(0);
    }

    return options;
}

/**
 * Daemon life cycle function invoked by init script. Creates a new Server with
 * the application at `appPath`. If the application exports a function called
 * `init`, it will be invoked with the new server as argument.
 *
 * @param {String} appPath optional application file name or module id.
 *     If undefined, the first command line argument will be used as application.
 *     If there are no command line arguments, module `main` in the current
 *     working directory is used.
 * @returns {Server} the Server instance.
 */
function init(appPath) {
    // protect against module reloading
    if (started) {
        return server;
    }
    // parse command line options
    try {
        options = parseOptions(system.args, {
            appName: "app"
        });
    } catch (error) {
        log.error("Error parsing options:", error);
        system.exit(1);
    }

    var appDir;
    var fs = require("fs");
    if (appPath) {
        // use argument as app module
        options.appModule = appPath;
        appDir = fs.directory(appPath);
    } else if (system.args[0]) {
        // take app module from command line
        appPath = fs.resolve(fs.workingDirectory(), system.args[0]);
        if (fs.isDirectory(appPath)) {
            // if argument is a directory assume app in main.js
            appDir = appPath;
            options.appModule = fs.join(appDir, "main");
        } else {
            // if argument is a file use it as config module
            options.appModule = appPath;
            appDir = fs.directory(appPath);
        }
    } else {
        // look for `main` module in current working directory as app module
        appDir = fs.workingDirectory();
        options.appModule = fs.join(appDir, "main");
    }

    log.info("Set app module:", options.appModule);

    server = new Server(options);
    var app = require(options.appModule);
    if (typeof app.init === "function") {
        app.init(server);
    }
    return server;
}

/**
 * Daemon life cycle function invoked by init script. Starts the Server created
 * by `init()`. If the application exports a function called `start`, it will be
 * invoked with the server as argument immediately after it has started.
 *
 * @returns {Server} the Server instance.
 */
function start() {
    if (started) {
        return server;
    }
    server.start();
    started = true;
    var app = require(options.appModule);
    if (typeof app.start === "function") {
        app.start(server);
    }
    return server;
}

/**
 * Daemon life cycle function invoked by init script. Stops the Server started
 * by `start()`.
 * @returns {Server} the Server instance. If the application exports a function
 * called `stop`, it will be invoked with the server as argument immediately
 * before it is stopped.
 *
 * @returns {Server} the Server instance.
 */
function stop() {
    if (!started) {
        return server;
    }
    var app = require(options.appModule);
    if (typeof app.stop === "function") {
        app.stop(server);
    }
    server.stop();
    started = false;
    return server;
}

/**
 * Daemon life cycle function invoked by init script. Frees any resources
 * occupied by the Server instance.  If the application exports a function
 * called `destroy`, it will be invoked with the server as argument.
 *
 * @returns {Server} the Server instance.
 */
function destroy() {
    if (server) {
        var app = require(options.appModule);
        if (typeof app.destroy === "function") {
            app.destroy(server);
        }
        server.destroy();
    }
    try {
        return server;
    } finally {
        server = null;
    }
}

/**
 * Main function to start an HTTP server from the command line.
 * @param {String} appPath optional application file name or module id.
 * @returns {Server} the Server instance.
 */
function main(appPath) {
    init(appPath);
    start();
    require('ringo/engine').addShutdownHook(function() {
        stop();
        destroy();
    });
    // return the server instance
    return server;
}

if (require.main == module) {
    main();
}
