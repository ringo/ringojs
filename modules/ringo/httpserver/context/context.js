const log = require("ringo/logging").getLogger(module.id);
const {ServletContextHandler, ServletHolder, FilterHolder} = org.eclipse.jetty.ee10.servlet;
const {StatisticsHandler} = org.eclipse.jetty.server.handler;
const {EnumSet} = java.util;
const {DispatcherType} = Packages.jakarta.servlet;
const {HttpCookie} = org.eclipse.jetty.http;

/**
 * Base context handler constructor
 * @param {org.eclipse.jetty.server.handler.ContextHandlerCollection} parentContainer The parent container of this context handler
 * @param {String} mountpoint The mountpoint of this context handler
 * @param {Object} options An options object to pass to the extending context (see
 * <a href="./application.html">ApplicationContext</a> and <a href="./static.html">StaticContext</a>)
 * @constructor
 */
const Context = module.exports = function Context(server, parentContainer, mountpoint, options) {
    let statisticsHandler = null;
    if (options.statistics === true) {
        // add statistics handler and use it as parent container for
        // the context handler created below
        statisticsHandler = new StatisticsHandler();

        let oldHandler = server.getHandler();
        statisticsHandler.setHandler(oldHandler);
        server.setHandler(statisticsHandler);
    }
    const contextHandler = new ServletContextHandler(mountpoint,  options.sessions, options.security);
    if (options.virtualHosts) {
        contextHandler.setVirtualHosts(Array.isArray(options.virtualHosts) ? options.virtualHosts : [String(options.virtualHosts)]);
    }
    parentContainer.addHandler(contextHandler);

    const sessionHandler = contextHandler.getSessionHandler();
    if (sessionHandler !== null) {
        if (Number.isInteger(options.sessionsMaxInactiveInterval)) {
            sessionHandler.setMaxInactiveInterval(options.sessionsMaxInactiveInterval);
        }
        if (typeof(options.sameSiteCookies) === "string") {
            sessionHandler.setSameSite(HttpCookie.SameSite.valueOf(options.sameSiteCookies));
        }
        const sessionCookieConfig = sessionHandler.getSessionCookieConfig();
        sessionCookieConfig.setHttpOnly(options.httpOnlyCookies !== false);
        sessionCookieConfig.setSecure(options.secureCookies === true);
        if (typeof(options.cookieName) === "string") {
            sessionCookieConfig.setName(options.cookieName);
        } else {
            sessionCookieConfig.setName("JSESSIONID");
        }
        sessionCookieConfig.setDomain(options.cookieDomain || null);
        sessionCookieConfig.setPath(options.cookiePath || null);
        sessionCookieConfig.setMaxAge(options.cookieMaxAge || -1);
    }

    Object.defineProperties(this, {
        /**
         * The statistics handler (if options.statistics is set to true)
         * @type org.eclipse.jetty.server.handler.StatisticsHandler
         */
        "statisticsHandler": {
            "value": statisticsHandler,
            "enumerable": true
        },
        /**
         * The servlet context handler
         * @type org.eclipse.jetty.servlet.ServletContextHandler
         */
        "contextHandler": {
            "value": contextHandler,
            "enumerable": true
        }
    });

    return this;
};

Context.prototype.toString = function() {
    return "[" + this.constructor.name + " " + this.contextHandler.contextPath + "]";
};

/**
 * Returns the key of this context handler
 * @returns {String} The key
 */
Context.prototype.getKey = function() {
    const mountpoint = this.contextHandler.getContextPath();
    const virtualHosts = this.contextHandler.getVirtualHosts();
    if (virtualHosts !== null && virtualHosts.length > 0) {
        return String(virtualHosts) + mountpoint;
    }
    return mountpoint;
};

/**
 * Adds a servlet at the give path to this context handler
 * @param {String} path The mountpoint
 * @param {jakarta.servlet.Servlet} servlet The servlet to add
 * @param {Object} initParams An object containing init parameters to pass to
 * <a href="https://www.eclipse.org/jetty/javadoc/current/org/eclipse/jetty/servlet/ServletContextHandler.html">org.eclipse.jetty.servlet.ServletContextHandler</a>
 * @returns {org.eclipse.jetty.servlet.ServletHolder} The servlet holder of this servlet
 */
Context.prototype.addServlet = function(path, servlet, initParams) {
    log.debug("Adding servlet {} -> {}", path, "->", servlet);
    const servletHolder = new ServletHolder(servlet);
    if (initParams != null && initParams.constructor === Object) {
        Object.keys(initParams).forEach(function(key) {
            servletHolder.setInitParameter(key, initParams[key]);
        });
    }
    this.contextHandler.addServlet(servletHolder, path);
    return servletHolder;
};

/**
 * Adds a servlet filter at the give path to this context handler
 * @param {String} path The path spec of this filter
 * @param {jakarta.servlet.Filter} filter The servlet filter to add
 * @param {Object} initParams An object containing init parameters to pass to
 * <a href="https://www.eclipse.org/jetty/javadoc/current/org/eclipse/jetty/servlet/FilterHolder.html">org.eclipse.jetty.servlet.FilterHolder</a>
 * @returns {org.eclipse.jetty.servlet.FilterHolder} The filter holder of this servlet filter
 */
Context.prototype.addFilter = function(path, filter, initParams) {
    log.debug("Adding filter {} -> {}", path, "->", filter);
    const filterHolder = new FilterHolder(filter);
    filterHolder.setName(filter.getClass().getName());
    if (initParams != null && initParams.constructor === Object) {
        Object.keys(initParams).forEach(function(key) {
            filterHolder.setInitParameter(key, initParams[key]);
        });
    }
    this.contextHandler.addFilter(filterHolder, path,
            EnumSet.of(DispatcherType.REQUEST, DispatcherType.ASYNC));
    return filterHolder;
};
