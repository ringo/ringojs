/**
 * Module for starting and stopping the jetty http server.
 */

importFromModule('helma.rhino', 'getRhinoEngine');

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
    var port = config.port || 8080;
    var mountpoint = config.mountpoint || '/';
    var staticDir = config.staticDir || 'static';
    var staticMountpoint = config.staticMountpoint || '/static';
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
            props.put("port", port.toString());
            xmlconfig.configure(server);
            //everything else is configured via idmap
            var idMap = xmlconfig.getIdMap();
            // java.lang.System.err.println("idmap: " + idMap);
            var contexts = idMap.get("contexts");
            // set up static context
            var staticCtx = new jetty.servlet.Context(contexts, staticMountpoint, false, false);
            staticCtx.setResourceBase(engine.getResource(staticDir));
            var staticHolder = new jetty.servlet.ServletHolder(jetty.servlet.DefaultServlet);
            staticCtx.addServlet(staticHolder, "/*");
            // set up helma servlet context
            var context = new jetty.servlet.Context(contexts, mountpoint, true, false);
            var servlet = new HelmaServlet(getRhinoEngine());
            var holder = new jetty.servlet.ServletHolder(servlet);
            context.addServlet(holder, "/*");
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
