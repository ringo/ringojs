const log = require("ringo/logging").getLogger(module.id);
const Context = require("./context");
const {JsgiServlet} = org.ringojs.jsgi;
const {JettyWebSocketCreator, JettyWebSocketServlet} = org.eclipse.jetty.ee10.websocket.server;
const {JettyWebSocketServletContainerInitializer} = org.eclipse.jetty.ee10.websocket.server.config;
const {EventSourceServlet} = org.eclipse.jetty.ee10.servlets;
const EventSource = require("../eventsource");
const WebSocket = require("../websocket");

/**
 * Application context handler constructor
 * @param {org.eclipse.jetty.server.handler.ContextHandlerCollection} The parent container of this context handler
 * @param {String} The mountpoint of this context handler
 * @param {Object} An options object (see <a href="./builder.html#serveApplication">HttpServerBuilder.serveApplication</a>)
 * @constructor
 * @extends Context
 */
const ApplicationContext = module.exports = function ApplicationContext() {
    Context.apply(this, arguments);
    return this;
};

ApplicationContext.prototype = Object.create(Context.prototype);
ApplicationContext.prototype.constructor = ApplicationContext;

/**
 * Serves the application passed as argument in this context
 * @param {String|Function} app The application to server. Can be defined either
 * as string specifying the application module to load, or as a function.
 * @param {org.ringojs.engine.RhinoEngine} engine Optional engine to pass to the JsgiServlet constructor
 * @returns {org.eclipse.jetty.servlet.ServletHolder}
 */
ApplicationContext.prototype.serve = function(app, engine) {
    log.info("Adding JSGI application {} -> {}",
            this.contextHandler.getContextPath(), app);
    engine = engine || require("ringo/engine").getRhinoEngine();
    let servlet = null;
    const params = {};
    if (typeof(app) === "string") {
        params["app-module"] = app;
        servlet = new JsgiServlet(engine);
    } else if (typeof(app) === "function") {
        servlet = new JsgiServlet(engine, app);
    } else {
        throw new Error("Application must be either a function or the path " +
                "to a module exporting a function");
    }
    return this.addServlet("/*", servlet, params);
};

/**
 * @see <a href="../builder.html#addWebSocket">HttpServerBuilder.addWebSocket()</a>
 * @returns {org.eclipse.jetty.servlet.ServletHolder}
 */
ApplicationContext.prototype.addWebSocket = function(path, onConnect, onCreate, initParams) {
    log.info("Starting websocket support");
    JettyWebSocketServletContainerInitializer.configure(this.contextHandler, null);

    const webSocketCreator = new JettyWebSocketCreator({
        "createWebSocket": function(request, response) {
            if (typeof(onCreate) === "function" && onCreate(request, response) !== true) {
                return null;
            }
            const socket = new WebSocket();
            socket.addListener("connect", function(session) {
                socket.session = session;
                if (typeof onConnect === "function") {
                    onConnect(socket, session);
                }
            });

            return socket.impl;
        }
    });

    this.addServlet(path, new JettyWebSocketServlet({
        "configure": function(factory) {
            factory.addMapping("/", (req, res) => webSocketCreator);
        }
    }), initParams);
};

/**
 * @see <a href="../builder.html#addEventSource">HttpServerBuilder.addEventSource()</a>
 * @returns {org.eclipse.jetty.servlet.ServletHolder}
 */
ApplicationContext.prototype.addEventSource = function(path, onConnect, initParams) {
    log.info("Starting eventsource support");
    this.addServlet(path, new EventSourceServlet({
        "newEventSource": function(request) {
            const socket = new EventSource();
            if (typeof onConnect === "function") {
                onConnect(socket, request);
            }
            return socket.impl;
        }
    }), initParams);
};
