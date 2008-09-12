/**
 * Module for starting and stopping the jetty http server.
 */

var { getRhinoEngine } = loadModule('helma.rhino');

// mark this module as shared between all requests
var __shared__ = true;

// the jetty server instance
var server;

/**
 * Start jetty server with the given configuration.
 * @param config Object a javascript object with any of the following properties:
 * <ul>
 * <li>configFile</li>
 * <li>port</li>
 * <li> mountpoint</li>
 * </li>staticDir</li>
 * </li>staticMountpoint</li>
 * </ul>
 */
function startServer(config) {
    config = config || {};
    var configFile = config.configFile || 'jetty.xml';
    // var staticIndex = config.staticIndex || config.staticIndex == undefined;
    if (!server) {
        var engine = getRhinoEngine();
        var jettyconfig = getResource(configFile);
        if (!jettyconfig.exists()) {
            throw Error('Resource "' + configFile + '" not found');
        }
        var jetty = org.mortbay.jetty;
        var XmlConfiguration = org.mortbay.xml.XmlConfiguration;
        var HelmaServlet = org.helma.web.HelmaServlet;
        server = new jetty.Server();
        try {
            var xmlconfig = new XmlConfiguration(jettyconfig.inputStream);
            // port config is done via properties
            var props = xmlconfig.getProperties();
            props.put('port', (config.port || 8080).toString());
            props.put('mountpoint', config.mountpoint || '/');
            props.put('staticMountpoint', config.staticMountpoint || '/static');
            xmlconfig.configure(server);
            //everything else is configured via idmap
            var idMap = xmlconfig.getIdMap();
            // java.lang.System.err.println("idmap: " + idMap);
            var staticCtx = idMap.get('staticContext');
            if (config.staticDir) {
                staticCtx.setResourceBase(engine.getResource(config.staticDir));
                var staticHolder = new jetty.servlet.ServletHolder(jetty.servlet.DefaultServlet);
                staticCtx.addServlet(staticHolder, "/*");
            }
            // set up helma servlet context
            var helmaCtx = idMap.get('helmaContext');
            var helmaServlet = new HelmaServlet(getRhinoEngine());
            helmaCtx.addServlet(new jetty.servlet.ServletHolder(helmaServlet), "/*");
            // start server
            server.start();
        } catch (error) {
            java.lang.System.err.println("Error starting jetty: " + error);
            error.rhinoException.printStackTrace();
            server.stop();
            server = null;
        }
    }
}

/**
 * Stop jetty server.
 */
function stopServer() {
    if (server) {
        server.stop();
        server = null;
        // Hack: keep jetty from creating a new shutdown hook with every new server
        java.lang.System.setProperty("JETTY_NO_SHUTDOWN_HOOK", "true");
    }
}
