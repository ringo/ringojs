/**
 * Module for starting and stopping the jetty http server.
 */

export('start', 'stop', 'initRequest', 'commitResponse');

// mark this module as shared between all requests
var __shared__ = true;

var log = require('helma/logging').getLogger(__name__);


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
            var engine = require('helma/system').getRhinoEngine();
            var jettyconfig = getResource(configFile);
            if (!jettyconfig.exists()) {
                throw Error('Resource "' + configFile + '" not found');
            }
            var jetty = org.mortbay.jetty;
            var XmlConfiguration = org.mortbay.xml.XmlConfiguration;
            var Servlet = org.helma.jack.JackServlet;
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
                        'moduleName': config.moduleName || 'helma/webapp',
                        'functionName': config.functionName || 'handleRequest'
                    };
                    for (var p in params) {
                        servletHolder.setInitParameter(p, params[p]);
                    }
                    helmaCtx.addServlet(servletHolder, "/*");
                }
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

/**
 * Set up the IO related properties of a jack environment object.
 * @param env a jack request object
 */
function initRequest(env) {
    var IO = require('io').IO;
    env['jack.input'] = new IO(env['jack.input'], null);
    env['jack.error'] = new IO(null, env['jack.error']);
}

/**
 * Apply the return value of a Jack application to a servlet response.
 * This is used internally by the org.helma.jack.JackServlet class, so
 * you won't need this unless you're implementing your own servlet
 * based jack connector.
 *
 * @param env the jack env argument
 * @param result the object returned by a jack application
 */
function commitResponse(env, result) {
    var response = env['jack.servlet_response'];
    if (response.isCommitted() || !(result instanceof Array))
        return;
	var [status, headers, body] = result;
	response.status = status;
	for (var name in headers) {
		response.setHeader(name, headers[name]);
	}
	var writer = response.writer;
	if (body && typeof body.forEach == "function") {
		body.forEach(function(chunk) {
			writer.write(String(chunk));
			writer.flush();
		})
	} else {
		writer.write(String(body));
	}
    writer.close();
}

