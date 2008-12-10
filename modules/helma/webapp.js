/*
 * The webapp module provides support for building web applications in Helma NG.
 */

// import modules
require('core.string');
require('helma.webapp.request');
require('helma.webapp.response');

import('helma.webapp.continuation', 'continuation');
import('helma.system', 'system');
import('helma.httpserver', 'server');
import('helma.logging', 'logging');

export('start', 'stop', 'getConfig', 'handleRequest', 'error', 'notfound');

var log = logging.getLogger(__name__);


/**
 * Handler function called by the Helma servlet. 
 *
 * @param req
 * @param res
 */
function handleRequest(req, res) {
    // get config and apply it to req, res
    var config = getConfig();
    if (log.debugEnabled) log.debug('got config: ' + config.toSource());

    req.charset = res.charset = config.charset || 'utf8';
    res.contentType = config.contentType || 'text/html';

    // invoke onRequest
    invokeMiddleware('onRequest', config.middleware, [req, res]);
    // resume continuation?
    if (continuation.resume(req, res)) {
        return;
    }

    // resolve path and invoke action
    var path = req.path;
    if (path.startsWith('/')) {
        // strip leading slash
        path = path.slice(1)
    }

    function getRegExp(pattern) {
        if (pattern instanceof RegExp) {
            return pattern;
        } else if (typeof pattern == "string") {
            return new RegExp(pattern);
        } else {
            throw Error("Pattern must be a regular expression or string");
        }
    }

    try {
        log.debug('resolving path ' + path);
        if (config.urls instanceof Array) {
            var urls = config.urls;
            for (var i = 0; i < urls.length; i++) {
                log.debug("checking url line: " + urls[i]);
                var match = getRegExp(urls[i][0]).exec(path);
                log.debug("got match: " + match);
                if (match != null) {
                    var action = urls[i][1];
                    log.debug("action: " + action);
                    if (typeof action == "string") {
                        log.debug("action is string");
                        var dot = action.lastIndexOf('.');
                        if (dot < 0) {
                            throw Error('Action must be of form "module.function"');
                        }
                        var module = action.slice(0, dot);
                        var func = action.slice(dot + 1);
                        action = require(module)[func];
                        if (log.debugEnabled) log.debug("resolved action: " + action);
                    } else if (typeof action != "function") {
                        throw Error('Action must either be a string or a function');
                    }
                    if (typeof action == "function") {
                        // got a match - add any regexp groups as additional action arguments
                        var args = [req, res];
                        var actionArgs = [];
                        for (var j = 1; j < match.length; j++) {
                            args.push(match[j]);
                            actionArgs.push(match[j]);
                        }
                        invokeMiddleware('onAction',
                                config.middleware,
                                [req, res, action, actionArgs]);
                        action.apply(null, args);
                        return;
                    }
                }
            }
        }
        notfound(req, res);
    } catch (e) {
        invokeMiddleware('onError', config.middleware, [req, res, e]);
        error(req, res, e);
    } finally {
        invokeMiddleware('onResponse', config.middleware, [req, res]);
    }
}

function invokeMiddleware(hook, middleware, args) {
    for (var i = 0; middleware && i < middleware.length; i++) {
        var signature = middleware[i] + '.' + hook;
        try {
            var module = require(middleware[i]);
            if (typeof module[hook] == 'function') {
                log.debug('invoking middleware: ' + signature);
                module[hook].apply(module, args);
            }
        } catch (e) {
            log.error('Error in ' + signature + ': ' + e);
        }
    }
}

/**
 * Standard error page
 * @param e the error that happened
 */
function error(req, res, e) {
    res.status = 500;
    res.contentType = 'text/html';
    res.writeln('<h2>', e, '</h2>');
    if (e.fileName && e.lineNumber) {
        res.writeln('<p>In file<b>', e.fileName, '</b>at line<b>', e.lineNumber, '</b></p>');
    }
    if (e.rhinoException) {
        res.writeln('<h3>Script Stack</h3>');
        res.writeln('<pre>', e.rhinoException.scriptStackTrace, '</pre>');
        res.writeln('<h3>Java Stack</h3>');
        var writer = new java.io.StringWriter();
        var printer = new java.io.PrintWriter(writer);
        e.rhinoException.printStackTrace(printer);
        res.writeln('<pre>', writer.toString(), '</pre>');
        log.error(e.toString(), e.rhinoException);
    } else {
        log.error(e.toString());
    }
    return null;
}

/**
 * Standard notfound page
 */
function notfound(req, res) {
    res.status = 404;
    res.contentType = 'text/html';
    res.writeln('<h1>Not Found</h1>');
    res.writeln('The requested URL', req.path, 'was not found on the server.');
    return null;
}

/**
 * Try to load the configuration module.
 * @param configModuleName optional module name, default is 'config'
 */
function getConfig(configModuleName) {
    configModuleName = configModuleName || 'config';
    var config;
    try {
        config = require(configModuleName);
    } catch (noConfig) {
        log.info('Couldn\'t load config module: ' + noConfig);
    }
    return config || {};
}

/**
 * Start the jetty server.
 */
function start(config) {
    // start jetty http server
    config = config || getConfig();
    var httpConfig = config.httpConfig;
    server.start(httpConfig);
}


/**
 * Stop the jetty server.
 */
function stop() {
    // stop jetty HTTP server
    server.stop();
}

if (__name__ == '__main__') {
    for (var i = 1; i < system.args.length; i++) {
        var arg = system.args[i];
        if (arg.indexOf('-') == 0) {
            break;
        }
        system.addRepository(arg);
    }
    log.info('Setup module search: ' + system.getRepositories());
    start();
}
