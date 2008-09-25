/*
 * The app module can be used to control a web application from javascript.
 * Currently this isn't used by the helma command line server (server.jar),
 * but it can be used to start the application server from the shell using
 * the following command:
 *
 *   importModule('app');
 *   app.start();
 *
 * It takes care of the following things:
 *
 *  - Initializing native host objects
 *  - Setting interceptors or rules to automatically switch optimization
 *      mode on certain requests
 *  - Starting and configuring the web server
 *
 */

__shared__ = true;

// import system and web server modules
var sys = loadModule('helma.system');
var srv = loadModule('helma.httpserver');
var log = loadModule('helma.logging').getLogger(__name__);


// define native host classes used by helma web apps
init();

/**
 * Set this rhino engine up for a web application, registering the standard classes
 * for request, response, session host objects.
 */
function init() {
    log.info('Initializing web app host objects');
    // set up standard web app host objects
    sys.addHostObject(org.helma.web.Buffer);
    sys.addHostObject(org.helma.web.Request);
    sys.addHostObject(org.helma.web.Response);
    sys.addHostObject(org.helma.web.Session);
    sys.addHostObject(org.helma.template.MacroTag);
    // register a request listener that automatically sets rhino optimization
    // level to -1 for requests that have a helma_continuation parameter.
    sys.addCallback('onInvoke', 'continuation-support', function(req) {
        if (req && req.params.helma_continuation != null) {
            sys.setRhinoOptimizationLevel(-1);
        }
    });
}

/**
 * Start the jetty server.
 */
function start(config) {
    // start jetty http server
    srv.start(config);
}


/**
 * Stop the jetty server.
 */
function stop() {
    // stop jetty HTTP server
    srv.stop();
}

if (__name__ == '__main__') {
    for (var i = 1; i < sys.args.length; i++) {
        var arg = sys.args[i];
        if (arg.indexOf('-') == 0) {
            break;
        }
        sys.addRepository(arg);
    }
    log.info('Setup module search: ' + sys.getRepositories());
    var setup;
    var httpConf;
    try {
        setup = loadModule('setup');
        httpConf = setup.httpConf;
    } catch (noSetup) {
        log.info('Couldn\'t load setup module - using defaults', noSetup.rhinoException);
    }
    start(httpConf);
}
