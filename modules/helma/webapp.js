/*
 * The webapp module provides support for building web applications in Helma NG.
 */

// import modules
require('core/string');

include('helma/webapp/request');
include('helma/webapp/response');
include('helma/buffer');

import('helma/engine', 'engine');
import('helma/httpserver', 'server');
import('helma/logging', 'logging');

export('start', 'stop', 'getConfig', 'handleRequest', 'error', 'notfound');

var log = logging.getLogger(module.id);

module.shared = true;

/**
 * Handler function called by the JSGI servlet.
 *
 * @param env the JSGI environment argument
 */
function handleRequest(env) {
    // get config and apply it to req, res
    var config = getConfig();
    if (log.debugEnabled) log.debug('got config: ' + config.toSource());

    var webenv = require('helma/webapp/env');
    webenv.env = env;
    var req = webenv.req = new Request(env);
    var res = null;

    req.charset = config.charset || 'utf8';

    // resolve path and invoke action
    var path = req.path;
    if (path.startsWith('/')) {
        // strip leading slash
        path = path.slice(1);
    }
    // used to compose req.actionPath, which is the part of the path
    // that resolves to the action (req.path minus argument elements)
    var actionPath = ["/"];
    
    try {
        res = resolveInConfig(req, config, actionPath, decodeURI(path), "");
    } catch (e) {
        if (e.retry) {
            throw e;
        } else if (e.redirect) {
            return new RedirectResponse(e.redirect);
        } else {
            res = error(req, e);
        }
    }
    return res;
}

function resolveInConfig(req, config, actionPath, path, prefix) {
    if (log.isDebugEnabled) log.debug('resolving path ' + path);
    // set config property in webapp env module
    var webenv = require('helma/webapp/env');
    webenv.config = config;

    if (Array.isArray(config.urls)) {
        for each (var url in config.urls) {
            if (log.isDebugEnabled) log.debug("checking url line: " + url);
            var match = getPattern(url).exec(path);
            if (log.isDebugEnabled) log.debug("got match: " + match);
            if (match != null) {
                var middleware = config.middleware;
                var middlewareIndex = 0;
                req.process = function() {
                    if (Array.isArray(middleware) && middlewareIndex < middleware.length) {
                        return invokeMiddleware(middleware[middlewareIndex++], [req]);
                    } else {
                        var module = getModule(url, prefix);
                        if (log.isDebugEnabled) log.debug("module: " + module);
                        // cut matching prefix from path
                        path = path.substring(match[0].length);
                        //remove leading and trailing slashes and split
                        var pathArray = path.replace(/^\/+|\/+$/g, "").split(/\/+/);
                        var action = getAction(module, pathArray[0]);
                        // log.debug("got action: " + action);
                        if (typeof action == "function" && pathArray.length <= action.length) {
                            // default action - make sure request path has trailing slash
                            if (!pathArray[0]) {
                                req.checkTrailingSlash()
                            }
                            // set req.actionPath to the part of the path that resolves to the action
                            actionPath.push(match[0], pathArray[0] || "index");
                            req.actionPath =  actionPath.join("/").replace(/\/+/g, "/");
                            // add remaining path elements as additional action arguments
                            var actionArgs = pathArray.slice(1);
                            var matchedArgs = match.slice(1);
                            var args = [req].concat(matchedArgs).concat(actionArgs);
                            var res = action.apply(module, args);
                            if (res && !Array.isArray(res) && typeof res.close === 'function') {
                                return res.close();
                            }
                            return res;
                        } else if (Array.isArray(module.urls)) {
                            // nested app - make sure request path has trailing slash
                            if (!path) {
                                req.checkTrailingSlash();
                            }
                            actionPath.push(match[0]);
                            return resolveInConfig(req, module, actionPath, path, match[0] + "/");
                        } else {
                            return notfound(req);
                        }
                    }
                }
                return req.process();

            }
        }
    }
}


function getPattern(spec) {
    var pattern = spec[0];
    if (typeof pattern == "string") {
        if (pattern.startsWith("/"))
            pattern = pattern.replace("/", "^");
        pattern = spec[0] = new RegExp(pattern);
    } else if (!(pattern instanceof RegExp)) {
        throw Error("Pattern must be a regular expression or string");
    }
    return pattern;
}

function getModule(spec, prefix) {
    var module = spec[1];
    if (typeof module == "string") {
        module = require(prefix + module);
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


function invokeMiddleware(middleware, args) {
    var functionName = 'handleRequest';
    var dot = middleware.indexOf('.');
    if (dot > -1) {
        functionName = middleware.substring(dot + 1);
        middleware = middleware.substring(0, dot);
    }
    var module = require(middleware);
    if (typeof module[functionName] !== 'function') {
        throw new Error('Middleware function ' + functionName + ' is not defined in ' + middleware);
    }
    log.debug('invoking middleware: ' + middleware);
    return module[functionName].apply(module, args);
}

/**
 * Standard error page
 * @param e the error that happened
 */
function error(req, e) {
    var res = new Response();
    res.status = 500;
    res.contentType = 'text/html';
    var msg = String(e).escapeHtml();
    res.writeln('<html><title>', msg, '</title>');
    res.writeln('<body><h1>', msg, '</h1>');
    var errors = engine.getErrors();
    for each (var error in errors) {
        res.writeln(renderSyntaxError(error));
    }
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
        res.writeln('<pre>', writer.toString().escapeHtml(), '</pre>');
        log.error(msg, e.rhinoException);
    } else {
        log.error(msg);
    }
    res.writeln('</body></html>');
    return res.close();
}

function renderSyntaxError(error) {
    var buffer = new Buffer();
    buffer.write("<div class='stack'>in ").write(error.sourceName);
    buffer.write(", line ").write(error.line);
    buffer.write(": <b>").write(error.message).write("</b></div>");
    if (error.lineSource) {
        buffer.write("<pre>").write(error.lineSource).write("\n");
        for (var i = 0; i < error.offset - 1; i++) {
            buffer.write(' ');
        }
        buffer.write("<b>^</b></pre>");
    }
    return buffer;
}

/**
 * Standard notfound page
 */
function notfound(req) {
    var res = new Response();
    var msg = 'Not Found';
    res.status = 404;
    res.contentType = 'text/html';
    res.writeln('<html><title>', msg, '</title>');
    res.writeln('<body><h2>', msg, '</h2>');
    res.writeln('<p>The requested URL', req.pathDecoded, 'was not found on the server.</p>');
    res.writeln('</body></html>');
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

if (require.main == module.id) {
    for (var i = 1; i < system.args.length; i++) {
        var arg = system.args[i];
        if (arg.indexOf('-') == 0) {
            break;
        }
        engine.addRepository(arg);
    }
    log.info('Setup module search: ' + engine.getRepositories());
    start();
}
