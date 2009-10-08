/**
 * Module for starting and stopping the jetty http server.
 */

export('start', 'stop');

// mark this module as shared between all requests
module.shared = true;
var log = require('helma/logging').getLogger(module.id);


(function() {

    // the jetty server instance
    var server;

    /**
     * Start a Jetty HTTP server with the given configuration. The configuration may
     * either pass properties to be used with the default jetty.xml, or define
     * a custom configuration file.
     *
     * @param config Object a javascript object with any of the following properties,
     * with the default value in parentheses:
     * <ul>
     * <li>configFile ('jetty.xml')</li>
     * <li>port (8080)</li>
     * <li> mountpoint ('/')</li>
     * <li>staticDir ('static')</li>
     * <li>staticMountpoint ('/static')</li>
     * <li>servletParams ({ module: 'helma/webapp',
     *                      function: 'handleServletRequest' })</li>
     * </ul>
     */
    this.start = function(config, func) {
        config = config || {};
        var configFile = config.configFile || 'config/jetty.xml';
        // var staticIndex = config.staticIndex || config.staticIndex == undefined;
        if (!server) {
            var engine = require('helma/engine').getRhinoEngine();
            var jettyconfig = getResource(configFile);
            if (!jettyconfig.exists()) {
                throw Error('Resource "' + configFile + '" not found');
            }
            var jetty = org.mortbay.jetty;
            var XmlConfiguration = org.mortbay.xml.XmlConfiguration;
            var Servlet = org.helma.jsgi.JsgiServlet;
            server = new jetty.Server();
            try {
                var xmlconfig = new XmlConfiguration(jettyconfig.inputStream);
                // port config is done via properties
                var props = xmlconfig.getProperties();
                props.put('port', (config.port || 8080).toString());
                if (config.host) props.put('host', config.host);
                props.put('mountpoint', config.mountpoint || '/');
                props.put('staticMountpoint', config.staticMountpoint || '/static');
                xmlconfig.configure(server);
                //everything else is configured via idmap
                var idMap = xmlconfig.getIdMap();
                // print("idmap: " + idMap);
                var staticCtx = idMap.get('staticContext');
                if (staticCtx && typeof config.staticDir == "string") {
                    staticCtx.setResourceBase(getResource(config.staticDir));
                    var staticHolder = new jetty.servlet.ServletHolder(jetty.servlet.DefaultServlet);
                    staticCtx.addServlet(staticHolder, "/*");
                }
                // set up helma servlet context
                var helmaCtx = idMap.get('helmaContext');
                if (helmaCtx) {
                    var servlet = func ? new Servlet(engine, func) : new Servlet(engine);
                    var servletHolder = new jetty.servlet.ServletHolder(servlet);
                    var params = {
                        'moduleName': config.moduleName || 'config',
                        'functionName': config.functionName || 'app'
                    };
                    for (var p in params) {
                        servletHolder.setInitParameter(p, params[p]);
                    }
                    helmaCtx.addServlet(servletHolder, "/*");
                }
                // start server
                server.start();
            } catch (error) {
                server.stop();
                server = null;
                throw error;
            }
        }
    }

    /**
     * Stop http server.
     */
    this.stop = function() {
        if (server) {
            server.stop();
            server = null;
            // Hack: keep jetty from creating a new shutdown hook with every new server
            java.lang.System.setProperty("JETTY_NO_SHUTDOWN_HOOK", "true");
        }
    }

})(this);


