/**
 * Module for starting and stopping the jetty http server.
 */

include('helma/webapp/util');
var IO = require('io').IO;
var ByteArray = require("binary").ByteArray;
var HashP = require('hashp').HashP;

export('start', 'stop', 'handleRequest');

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

/**
 * Handle a JSGI request.
 * @param module the module. Ignored if func is already a function.
 * @param func the function, either as function object or function name to be
 *             imported from module.
 * @param env the JSGI env object
 */
function handleRequest(module, func, env) {
    initRequest(env);
    var result = typeof(func) == 'function' ?
                 func(env) :
                 require(module)[func](env);
    commitResponse(env, result);
}

/**
 * Set up the IO related properties of a jsgi environment object.
 * @param env a jsgi request object
 */
function initRequest(env) {
    var input, errors;
    Object.defineProperty(env, "jsgi.input", {
        get: function() {
            if (!input)
                input = new IO(env['jsgi.servlet_request'].getInputStream(), null);
            return input;
        }
    });
    Object.defineProperty(env, "jsgi.errors", {
        get: function() {
            if (!errors)
                errors = new IO(null, java.lang.System.err);
            return errors;
        }
    });
}

/**
 * Apply the return value of a JSGI application to a servlet response.
 * This is used internally by the org.helma.jsgi.JsgiServlet class, so
 * you won't need this unless you're implementing your own servlet
 * based JSGI connector.
 *
 * @param env the JSGI env argument
 * @param result the object returned by a JSGI application
 */
function commitResponse(env, result) {
    var response = env['jsgi.servlet_response'];
    if (response.isCommitted())
        return;
    if (!result || typeof result.forEach != "function") {
        // convert helma response to jsgi response
        if (result && typeof result.close === "function") {
            result = result.close();
        } else {
            throw "Unsupported response object: " + result;
        }
    }
    var [status, headers, body] = result;
    response.status = status;
    for (var name in headers) {
        response.setHeader(name, headers[name]);
    }
    var charset = getSubHeader(HashP.get(headers, "content-type"), "charset");
    var output = response.getOutputStream();
    if (body && typeof body.forEach == "function") {
        /* var contentLength = 0;
        var bytes = [];
        body.forEach(function(part) {
            var bin = part.toBinary(charset);
            contentLength += bin.getLength();
            bytes.push(bin.bytes);
        })
        response.setContentLength(contentLength);
        for (var i = 0; i < bytes.length; i++) {
            output.write(bytes[i]);
        } */
        body.forEach(function(part) {
            output.write(part.toByteArray(charset));
        });
    } else {
        throw new Error("Unsupported response body: " + body);
    }
    output.close();
}

