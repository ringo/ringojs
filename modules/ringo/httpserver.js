/**
 * Module for starting and stopping the jetty http server.
 */

export('Server');

require('core/object');

var log = require('ringo/logging').getLogger(module.id);


/**
 * Create a Jetty HTTP server with the given options. The options may
 * either define properties to be used with the default jetty.xml, or define
 * a custom configuration file.
 *
 * @param {Object} options A javascript object with any of the following properties,
 * with the default value in parentheses:
 * <ul>
 * <li>jettyConfig ('config/jetty.xml')</li>
 * <li>port (8080)</li>
 * <li>host (undefined)</li>
 * </ul>
 *
 * For convenience, the constructor supports the definition of a JSGI and static
 * resource mapping in the config object using the following properties:
 * <ul>
 * <li>virtualHost (undefined)</li>
 * <li>mountpoint ('/')</li>
 * <li>staticDir ('static')</li>
 * <li>staticMountpoint ('/static')</li>
 * <li>config ('config')</li>
 * <li>app ('app')</li>
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
     * Get the server's default context. The default context is the
     * context that is created when the server is created. 
     * @since: 0.6
     * @returns the default context
     */
    this.getDefaultContext = function() {
        return defaultContext;
    };

    /**
     * Get a servlet application context for the given path and virtual hosts, creating
     * it if it doesn't exist.
     * @param {string} path the context root path such as "/" or "/app"
     * @param {string|array} virtualHosts optional single or multiple virtual host names.
     *   A virtual host may start with a "*." wildcard.
     * @param {Object} options may have the following properties:
     *   sessions: true to enable sessions for this context, false otherwise
     *   security: true to enable security for this context, false otherwise
     * @since: 0.6
     * @returns a Context object
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
            contextMap[contextKey] = cx;
            if (jetty.isRunning()) {
                cx.start();
            }
        }

        return {
            /**
             * Map this context to a JSGI application.
             * @param {function|object} app a JSGI application, either as a function or an object
             *   with properties <code>config</code> and <code>app</code> defining
             *   the application.
             *   <div><code>{ config: 'config', app: 'app' }</code></div>
             * @param {RhinoEngine} engine optional RhinoEngine instance for multi-engine setups
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
                    servletHolder.setInitParameter('config', app.config || 'config');
                    servletHolder.setInitParameter('app', app.app || 'app');
                }
                cx.addServlet(servletHolder, "/*");
            },
            /**
             * Map this context to a directory containing static resources.
             * @param {string} dir the directory from which to serve static resources
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
             * @param {string} servletPath the servlet path
             * @param {Servlet} servlet a java object implementing the javax.servlet.Servlet interface.
             * @param {Object} initParams optional object containing servlet init parameters
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
            }
        };
    };

    /**
     * Start the HTTP server.
     */
    this.start = function() {
        jetty.start();
    };

    /**
     * Stop the HTTP server.
     */
    this.stop = function() {
        jetty.stop();
    };

    /**
     * Destroy the HTTP server, freeing its resources.
     */
    this.destroy = function() {
        jetty.destroy();
    };

    /**
     * Checks whether this server is currently running.
     * @returns true if the server is running, false otherwise.
     */
    this.isRunning = function() {
        return jetty != null && jetty.isRunning();
    };

    /**
     * Get the Jetty server instance
     * @returns the Jetty Server instance
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
    // port config is done via properties
    var props = xmlconfig.getProperties();
    props.put('port', (options.port || 8080).toString());
    if (options.host) props.put('host', options.host);
    xmlconfig.configure(jetty);

    // create default context
    defaultContext = this.getContext(options.mountpoint || "/", options.virtualHost, {
        security: true,
        sessions: true
    });

    // If options defines an application mount it
    if (options.app && options.config) {
        defaultContext.serveApplication(options);
    }

    // Allow definition of app/static mappings in server config for convenience
    if (options.staticDir) {
        var fileutils = require('ringo/fileutils');
        var staticContext = this.getContext(options.staticMountpoint || '/static', options.virtualHost);
        staticContext.serveStatic(fileutils.resolveId(options.config, options.staticDir));
    }

    // Start listeners. This allows us to run on priviledged port 80 under jsvc
    // even as non-root user if the constructor is called with root privileges
    // while start() is called with the user we will actually run as
    var connectors = jetty.getConnectors();
    for each (var connector in connectors) {
        connector.open();
    }

}


