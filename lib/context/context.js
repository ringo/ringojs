const log = require("ringo/logging").getLogger(module.id);
const {ServletContextHandler, ServletHolder, FilterHolder} = org.eclipse.jetty.servlet;
const {StatisticsHandler} = org.eclipse.jetty.server.handler;
const {EnumSet} = java.util;
const {DispatcherType} = javax.servlet;

const Context = module.exports = function Context(parentContainer, mountpoint, options) {
    let statisticsHandler = null;
    if (options.statistics === true) {
        // add statistics handler and use it as parent container for
        // the context handler created below
        statisticsHandler = new StatisticsHandler();
        parentContainer.addHandler(statisticsHandler);
        parentContainer = statisticsHandler;
    }
    const contextHandler = new ServletContextHandler(parentContainer, mountpoint,
            options.sessions, options.security);
    if (options.virtualHosts) {
        contextHandler.setVirtualHosts(Array.isArray(options.virtualHosts) ?
                options.virtualHosts : [String(options.virtualHosts)]);
    }
    const sessionHandler = contextHandler.getSessionHandler();
    if (sessionHandler !== null) {
        if (Number.isInteger(options.sessionsMaxInactiveInterval)) {
            sessionHandler.setMaxInactiveInterval(options.sessionsMaxInactiveInterval);
        }
        const sessionCookieConfig = sessionHandler.getSessionCookieConfig();
        sessionCookieConfig.setHttpOnly(options.httpOnlyCookies);
        sessionCookieConfig.setSecure(options.secureCookies);
        if (typeof(options.cookieName) === "string") {
            sessionCookieConfig.setName(options.cookieName);
        }
        sessionCookieConfig.setDomain(options.cookieDomain);
        sessionCookieConfig.setPath(options.cookiePath);
        sessionCookieConfig.setMaxAge(options.cookieMaxAge);
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
    const mountpoint = this.contextHandler.getContextPath();
    const virtualHosts = this.contextHandler.getVirtualHosts();
    if (virtualHosts !== null && virtualHosts.length > 0) {
        return String(virtualHosts) + mountpoint;
    }
    return mountpoint;
};

Context.prototype.addServlet = function(path, servlet, initParams) {
    log.debug("Adding servlet {} -> {}", path, "->", servlet);
    const servletHolder = new ServletHolder(servlet);
    if (initParams != null && initParams.constructor === Object) {
        for each (let [key, value] in Iterator(initParams)) {
            servletHolder.setInitParameter(key, value);
        }
    }
    this.contextHandler.addServlet(servletHolder, path);
    return servletHolder;
};

Context.prototype.addFilter = function(path, filter, initParams) {
    log.debug("Adding filter {} -> {}", path, "->", filter);
    const filterHolder = new FilterHolder(filter);
    filterHolder.setName(filter.getClass().getName());
    if (initParams != null && initParams.constructor === Object) {
        for each (let [key, value] in Iterator(initParams)) {
            filterHolder.setInitParameter(key, value);
        }
    }
    this.contextHandler.addFilter(filterHolder, path,
            EnumSet.of(DispatcherType.REQUEST, DispatcherType.ASYNC));
    return filterHolder;
};