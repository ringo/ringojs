/*
 * The webapp module provides support for building web applications in Helma NG.
 */

// import modules
require('core/string');

include('helma/webapp/request');
include('helma/webapp/response');

import('helma/system', 'system');
import('helma/httpserver', 'server');
import('helma/logging', 'logging');

export('start', 'stop', 'getConfig', 'handleRequest', 'error', 'notfound');

var log = logging.getLogger(__name__);

var __shared__ = true;

/**
 * Handler function called by the Jack servlet.
 *
 * @param env the jack environment argument
 */
function handleRequest(env) {
    // get config and apply it to req, res
    var config = getConfig();
    if (log.debugEnabled) log.debug('got config: ' + config.toSource());

    var req = new Request(env);
    var res = null;
    // set up jack env, request and config properties in per-request env module
    var webenv = require('helma/webapp/env');
    webenv.init(env, req, config);

    req.charset = config.charset || 'utf8';

    // resolve path and invoke action
    var path = req.path;
    if (path.startsWith('/')) {
        // strip leading slash
        path = path.slice(1);
    }

    function getPattern(spec) {
        var pattern = spec[0];
        if (typeof pattern == "string") {
            pattern = spec[0] = new RegExp(pattern);
        } else if (!(pattern instanceof RegExp)) {
            throw Error("Pattern must be a regular expression or string");
        }
        return pattern;
    }

    function getModule(spec) {
        var module = spec[1];
        if (typeof module == "string") {
            module = require(module);
        } else if (!(module instanceof Object)) {
            throw Error("Module must be a string or object");
        }
        return module;
    }

    function getAction(module, name) {
        name = name || "index";
        var action = module[name.replace(/\./g, "_")];
        if (typeof action == "function") {
            return action;
        }
        return null;
    }

    

    try {
        log.debug('resolving path ' + path);
        if (config.urls instanceof Array) {
            var urls = config.urls;
            for (var i = 0; i < urls.length; i++) {
                log.debug("checking url line: " + urls[i]);
                var match = getPattern(urls[i]).exec(path);
                log.debug("got match: " + match);
                if (match != null) {
                    var module = getModule(urls[i]);
                    log.debug("module: " + module);
                    // cut matching prefix from path
                    path = path.substring(match[0].length);
                    // remove leading and trailing slashes
                    path = path.replace(/^\/+|\/+$/g, "");
                    //split
                    path = path.split(/\/+/);
                    var action = getAction(module, path[0]);
                    if (typeof action == "function" && path.length <= action.length) {
                        // add remaining path elements as additional action arguments
                        var actionArgs = path.slice(1).map(decodeURIComponent);
                        var matchedArgs = match.slice(1).map(decodeURIComponent);
                        var args = [req].concat(matchedArgs).concat(actionArgs);
                        var middleware = config.middleware;
                        var middlewareIndex = 0;
                        // set up middleware chain in request object
                        req.process = function() {
                            if (middlewareIndex < middleware.length) {
                                return invokeMiddleware(middleware[middlewareIndex++], [req]);
                            } else {
                                return action.apply(module, args);
                            }
                        }
                        res = req.process();
                    }
                    break;
                }
            }
        }
    } catch (e) {
        if (e.retry) {
            throw e;
        } else if (e.redirect) {
            return new RedirectResponse(e.redirect);
        } else {
            res = error(req, e);
        }
    } finally {
        // TODO
        if (!res)
            res = notfound(req);
        if (!(res instanceof Array) && res.close)
            res = res.close();
    }
    return res;
}

function invokeMiddleware(middleware, args) {
    var functionName = 'handleRequest';
    var dot = middleware.indexOf('.');
    if (dot > -1) {
        functionName = middleware.substring(dot + 1);
        middleware = middleware.substring(0, dot);
    }
    try {
        var module = require(middleware);
        if (typeof module[functionName] !== 'function') {
            throw new Error('Middleware function ' + functionName + ' is not defined in ' + middleware);
        }
        log.debug('invoking middleware: ' + middleware);
        return module[functionName].apply(module, args);
    } catch (e) {
        if (!e.retry && !e.redirect) {
            log.error('Error in ' + middleware + ': ' + e);
        }
        throw e;
    }
}

/**
 * Standard error page
 * @param e the error that happened
 */
function error(req, e) {
    var res = new Response();
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
    return res.close();
}

/**
 * Standard notfound page
 */
function notfound(req) {
    var res = new Response();
    res.status = 404;
    res.contentType = 'text/html';
    res.writeln('<h1>Not Found</h1>');
    res.writeln('The requested URL', req.path, 'was not found on the server.');
    return res.close();
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
