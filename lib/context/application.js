var log = require("ringo/logging").getLogger(module.id);
var Context = require("./context");
var {JsgiServlet} = org.ringojs.jsgi;
var {WebSocketServlet, WebSocketCreator} = org.eclipse.jetty.websocket.servlet;
var WebSocket = require("../websocket");

var ApplicationContext = module.exports = function ApplicationContext() {
    Context.apply(this, arguments);
    return this;
};

ApplicationContext.prototype = Object.create(Context.prototype);
ApplicationContext.prototype.constructor = ApplicationContext;

ApplicationContext.prototype.serve = function(app, engine) {
    log.info("Adding JSGI application {} -> {}",
            this.contextHandler.getContextPath(), app);
    engine = engine || require("ringo/engine").getRhinoEngine();
    if (app == null) {
        throw new Error("Missing application to serve");
    } else if (typeof(app) === "string") {
        app = require(app);
    } else if (typeof(app) !== "function") {
        throw new Error("Application must be either a function or the path " +
                "to a module exporting an 'app' function");
    }
    return this.addServlet("/*", new JsgiServlet(engine, app));
};

ApplicationContext.prototype.addWebSocket = function(path, onConnect, onCreate, initParams) {
    log.info("Starting websocket support");

    var webSocketCreator = new WebSocketCreator({
        "createWebSocket": function(request, response) {
            if (typeof(onCreate) === "function" && onCreate(request, response) !== true) {
                return null;
            }
            var socket = new WebSocket();
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