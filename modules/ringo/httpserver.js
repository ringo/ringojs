/**
 * Module for starting and stopping the jetty http server.
 */

export('Server');

require('core/object');

// mark this module as shared between all requests
module.shared = true;
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
 * <li>moduleName ('config')</li>
 * <li>functionName ('app')</li>
 * </ul>
 */
function Server(options) {

    if (!(this instanceof Server)) {
        return new Server(options);
    }

    // the jetty server instance
    var jetty;
    var xmlconfig;

    function createContext(path, vhosts, enableSessions, enableSecurity) {
        var idMap = xmlconfig.getIdMap();
        var contexts = idMap.get("Contexts");
        var context = new org.eclipse.jetty.servlet.ServletContextHandler(contexts, path, enableSessions, enableSecurity);
        if (vhosts) {
            context.setVirtualHosts(Array.isArray(vhosts) ? vhosts : [String(vhosts)]);
        }
        return context;
    }

    /**
     * Map a request path to a JSGI application.
     * Map a request path to a directory containing static resources.
     * @param {string} path a request path such as "/foo/bar" or "/"
     * @param {string|array} vhosts optional single or multiple virtual host names.
     *   A virtual host may start with a "*." wildcard.
     * @param {function|object} app a JSGI application, either as a function or an object
     *   with properties <code>moduleName</code> and <code>functionName</code> defining
     *   the application.
     *   <div><code>{ moduleName: 'config', functionName: 'app' }</code></div>
     * @param {RhinoEngine} engine optional RhinoEngine instance for multi-engine setups
     */
    this.addApplication = function(path, vhosts, app, engine) {
        log.info("Adding JSGI handler: " + path + " -> " + app.toSource());
        var context = createContext(path, vhosts, true, true);
        engine = engine || require('ringo/engine').getRhinoEngine();
        var isFunction = typeof app === "function";
        var servlet = isFunction ?
                      new JsgiServlet(engine, app) :
                      new JsgiServlet(engine);
        var jpkg = org.eclipse.jetty.servlet;
        var servletHolder = new jpkg.ServletHolder(servlet);
        if (!isFunction) {
            servletHolder.setInitParameter('moduleName', app.config || 'config');
            servletHolder.setInitParameter('functionName', app.app || 'app');
        }
        context.addServlet(servletHolder, "/*");
        if (jetty.isRunning()) {
            context.start();
        }
    };

    /**
     * Map a request path to a directory containing static resources.
     * @param {string} path a request path such as "/foo/bar" or "/"
     * @param {string|array} vhosts optional single or multiple virtual host names
     *   A virtual host may start with a "*." wildcard.
     * @param {string} dir the directory from which to serve static resources
     */
    this.addStaticResources = function(path, vhosts, dir) {
        log.info("Adding static handler: " + path + " -> " + dir);
        var context = createContext(path, vhosts, false, true);
        var repo = getRepository(dir);
        context.setResourceBase(repo.exists() ? repo.getPath() : dir);
        var jpkg = org.eclipse.jetty.servlet;
        var servletHolder = new jpkg.ServletHolder(jpkg.DefaultServlet);
        // staticHolder.setInitParameter("aliases", "true");
        context.addServlet(servletHolder, "/*");
        if (jetty.isRunning()) {
            context.start();
        }
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

    // Hack: keep jetty from creating a new shutdown hook with every new server
    java.lang.System.setProperty("JETTY_NO_SHUTDOWN_HOOK", "true");

    // init code
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

    // If options defines an application mount it
    if (options.app && options.config) {
        this.addApplication(options.mountpoint || '/', options.virtualHost, options);
    }

    // Allow definition of app/static mappings in server config for convenience
    if (options.staticDir) {
        var fileutils = require('ringo/fileutils');
        this.addStaticResources(options.staticMountpoint || '/static',
                options.virtualHost, fileutils.resolveId(options.config, options.staticDir));
    }

    // Start listeners. This allows us to run on priviledged port 80 under jsvc
    // even as non-root user if the constructor is called with root privileges
    // while start() is called with the user we will actually run as
    var connectors = jetty.getConnectors();
    for each (var connector in connectors) {
        connector.open();
    }

}


