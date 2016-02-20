var log = require('ringo/logging').getLogger(module.id);
var {XmlConfiguration} = org.eclipse.jetty.xml;
var {Server, HttpConfiguration, HttpConnectionFactory,
        ServerConnector} = org.eclipse.jetty.server;
var {HandlerCollection, ContextHandlerCollection} = org.eclipse.jetty.server.handler;
var objects = require("ringo/utils/objects");
var ApplicationContext = require("./context/application");
var StaticContext = require("./context/static");
var fs = require("fs");

var HttpServer = module.exports = function HttpServer(xmlPath) {
    if (!(this instanceof HttpServer)) {
        return new HttpServer(xmlPath);
    }

    var jetty = new Server();
    var xmlConfig = null;
    if (xmlPath != null) {
        var xmlResource = getResource(xmlPath);
        if (!xmlResource.exists()) {
            throw Error('Jetty XML configuration "' + xmlResource + '" not found');
        }
        xmlConfig = new XmlConfiguration(xmlResource.inputStream);
        xmlConfig.configure(jetty);
    }

    Object.defineProperties(this, {
        "jetty": {
            "value": jetty,
            "enumerable": true
        },
        "xmlConfig": {
            "value": xmlConfig,
            "enumerable": true
        },
        "contexts": {
            "value": {},
            "enumerable": true
        }
    });

    return this;
};

HttpServer.prototype.toString = function() {
    return "[HttpServer]";
};

HttpServer.prototype.createHttpConfig = function(options) {
    options = objects.merge(options || {}, {
        "requestHeaderSize": 8129,
        "outputBufferSize": 32768,
        "responseHeaderSize": 8129
    });
    var httpConfig = new HttpConfiguration();
    httpConfig.setRequestHeaderSize(options.requestHeaderSize);
    httpConfig.setOutputBufferSize(options.outputBufferSize);
    httpConfig.setResponseHeaderSize(options.responseHeaderSize);
    return httpConfig;
};

HttpServer.prototype.createConnector = function(options) {
    options = objects.merge(options || {}, {
        "host": "0.0.0.0",
        "port": 8080
    });
    var httpConfig = this.createHttpConfig(options);
    var httpConfigFactory = new HttpConnectionFactory(httpConfig);
    var connector = new ServerConnector(this.jetty, httpConfigFactory);
    connector.setHost(options.host);
    connector.setPort(options.port);
    if (typeof(options.name) === "string") {
        connector.setName(options.name);
    }
    return connector;
};

HttpServer.prototype.listen = function(options) {
    var connector = this.createConnector(options);
    this.jetty.addConnector(connector);
    return connector;
};

HttpServer.prototype.getHandlerCollection = function() {
    var handlerCollection = this.jetty.getHandler();
    if (handlerCollection === null) {
        handlerCollection = new HandlerCollection();
        this.jetty.setHandler(handlerCollection);
    }
    return handlerCollection;
};

HttpServer.prototype.getContextHandlerCollection = function() {
    var handlerCollection = this.getHandlerCollection();
    var contextHandlerCollection =
            handlerCollection.getChildHandlerByClass(ContextHandlerCollection);
    if (contextHandlerCollection === null) {
        contextHandlerCollection = new ContextHandlerCollection();
        handlerCollection.addHandler(contextHandlerCollection);
    }
    return contextHandlerCollection;
};

HttpServer.prototype.addContext = function(context) {
    this.contexts[context.getKey()] = context;
    if (this.jetty.isRunning()) {
        context.contextHandler.start();
    }
    return context;
};

HttpServer.prototype.serveApplication = function(mountpoint, app, options) {
    if (typeof(mountpoint) !== "string") {
        throw new Error("Missing mountpoint argument");
    }
    if (app == null) {
        throw new Error("Missing application to serve");
    } else if (typeof(app) !== "function" && typeof(app) !== "string") {
        throw new Error("Application must be either a function or the path " +
                "to a module exporting an 'app' function");
    }
    options || (options = {});
    options = {
        "security": options.security !== false,
        "sessions": options.sessions !== false,
        "cookieName": options.cookieName || null,
        "cookieDomain": options.cookieDomain || null,
        "cookiePath": options.cookiePath || null,
        "httpOnlyCookies": options.httpOnlyCookies === true,
        "secureCookies": options.secureCookies === true,
        "statistics": options.statistics === true,
        "virtualHosts": options.virtualHosts
    };
    var parentContainer = this.getContextHandlerCollection();
    var context = new ApplicationContext(parentContainer, mountpoint, options);
    if (typeof app === "function") {
        context.serve(app);
    } else {
        // FIXME: appName "app" is determined by JsgiServlet/jsgiConnector
        context.serve({
            "appModule": app,
            "appName": "app"
        });
    }
    return this.addContext(context);
};

HttpServer.prototype.serveStatic = function(mountpoint, directory, options) {
    if (typeof(mountpoint) !== "string") {
        throw new Error("Missing mountpoint argument");
    }
    if (typeof(directory) !== "string") {
        throw new Error("Missing directory argument");
    } else if (!fs.exists(directory) || !fs.isDirectory(directory)) {
        throw new Error("Directory '" + directory + "' doesn't exist or is not a directory");
    }
    options || (options = {});
    var initParameters = {
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
    var parentContainer = this.getContextHandlerCollection();
    var context = new StaticContext(parentContainer, mountpoint, {
            "security": options.security === true,
            "sessions": options.sessions === true,
            "virtualHosts": options.virtualHosts
        });
    context.serve(directory, initParameters);
    return this.addContext(context);
};
