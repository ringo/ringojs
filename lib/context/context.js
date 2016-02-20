var log = require("ringo/logging").getLogger(module.id);
var {ServletContextHandler, ServletHolder} = org.eclipse.jetty.servlet;
var {StatisticsHandler} = org.eclipse.jetty.server.handler;

var Context = module.exports = function Context(parentContainer, mountpoint, options) {
    var statisticsHandler = null;
    if (options.statistics === true) {
        // add statistics handler and use it as parent container for
        // the context handler created below
        statisticsHandler = new StatisticsHandler();
        parentContainer.addHandler(statisticsHandler);
        parentContainer = statisticsHandler;
    }
    var contextHandler = new ServletContextHandler(parentContainer, mountpoint,
            options.sessions, options.security);
    if (options.virtualHosts) {
        contextHandler.setVirtualHosts(Array.isArray(options.virtualHosts) ?
                options.virtualHosts : [String(options.virtualHosts)]);
    }
    var sessionHandler = contextHandler.getSessionHandler();
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

    Object.defineProperties(this, {
        "statisticsHandler": {
            "value": statisticsHandler,
            "enumerable": true
        },
        "contextHandler": {
            "value": contextHandler,
            "enumerable": true
        }
    });

    return this;
};

Context.prototype.getKey = function() {
    var mountpoint = this.contextHandler.getContextPath();
    var virtualHosts = this.contextHandler.getVirtualHosts();
    if (virtualHosts !== null && virtualHosts.length > 0) {
        return String(virtualHosts) + mountpoint;
    }
    return mountpoint;
};

Context.prototype.addServlet = function(path, servlet, initParams) {
    log.debug("Adding servlet {} -> {}", path, "->", servlet);
    var servletHolder = new ServletHolder(servlet);
    if (initParams != null && initParams.constructor === Object) {
        for each (let [key, value] in Iterator(initParams)) {
            servletHolder.setInitParameter(key, value);
        }
    }
    this.contextHandler.addServlet(servletHolder, path);
    return servletHolder;
};
