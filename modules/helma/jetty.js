/**
 * Module for starting and stopping the jetty http server.
 */

importFromModule('helma.rhino', 'getRhinoEngine');

// mark this module as shared between all requests
var __shared__ = true;

// the jetty server instance
var server;

/**
 * Start jetty server using jetty.xml as blueprint.
 */
function startServer(config) {
    config = config || 'jetty.xml';
    if (!server) {
        var jettyconfig = getResource(config);
        if (!jettyconfig.exists()) {
            throw Error('Resource "' + config + '" not found');
        }
        var jetty = org.mortbay.jetty;
        var XmlConfiguration = org.mortbay.xml.XmlConfiguration;
        var HelmaServlet = org.helma.web.HelmaServlet;
        server = new jetty.Server();
        try {
            var xmlconfig = new XmlConfiguration(jettyconfig.inputStream);
            xmlconfig.configure(server);
            var idMap = xmlconfig.getIdMap();
            var handler = idMap.get("Contexts");
            var context = new jetty.servlet.Context(handler, "/", true, false);
            var servlet = new HelmaServlet(getRhinoEngine());
            var holder = new jetty.servlet.ServletHolder(servlet);
            context.addServlet(holder, "/*");
            server.start();
        } catch (error) {
            java.lang.System.err.println("Error starting jetty: " + error);
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
    }
}
