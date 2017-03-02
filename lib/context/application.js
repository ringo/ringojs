const log = require("ringo/logging").getLogger(module.id);
const Context = require("./context");
const {JsgiServlet} = org.ringojs.jsgi;
const {WebSocketServlet, WebSocketCreator} = org.eclipse.jetty.websocket.servlet;
const {EventSourceServlet} = org.eclipse.jetty.servlets;
const EventSource = require("../eventsource");
const WebSocket = require("../websocket");

const ApplicationContext = module.exports = function ApplicationContext() {
    Context.apply(this, arguments);
    return this;
};

ApplicationContext.prototype = Object.create(Context.prototype);
ApplicationContext.prototype.constructor = ApplicationContext;

ApplicationContext.prototype.serve = function(app, engine) {
    log.info("Adding JSGI application {} -> {}",
            this.contextHandler.getContextPath(), app);
    engine = engine || require("ringo/engine").getRhinoEngine();
    let servlet = null;
    const params = {};
    if (app == null) {
        throw new Error("Missing application to serve");
    } else if (typeof(app) === "string") {
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

ApplicationContext.prototype.addWebSocket = function(path, onConnect, onCreate, initParams) {
    log.info("Starting websocket support");

    const webSocketCreator = new WebSocketCreator({
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

    this.addServlet(path, new WebSocketServlet({
        "configure": function(factory) {
            factory.setCreator(webSocketCreator);
        }
    }), initParams);
};

ApplicationContext.prototype.addEventSource = function(path, onconnect, initParams) {
    log.info("Starting eventsource support");
    this.addServlet(path, new EventSourceServlet({
        "newEventSource": function(request) {
            const socket = new EventSource();
            if (typeof onconnect === "function") {
                onconnect(socket, request);
            }
            return socket.impl;
        }
    }), initParams);
};
