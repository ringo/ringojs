/*
 * The webapp module provides support for building web applications in Helma NG.
 */

// import modules
require('core/string');

include('helma/webapp/request');
include('helma/webapp/response');

import('helma/engine', 'engine');
import('helma/httpserver', 'server');
import('helma/logging', 'logging');

export('start', 'stop', 'getConfig', 'handleRequest');

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
    } catch (e if (e.retry || e.redirect)) {
        if (e.retry) {
            throw e;
        } else if (e.redirect) {
            return new RedirectResponse(e.redirect);
        }
    }
    return res;
}

function resolveInConfig(req, config, actionPath, path) {
    if (log.isDebugEnabled) log.debug('resolving path ' + path);
    // set config property in webapp env module
    var webenv = require('helma/webapp/env');
    webenv.addConfig(config);

    if (!Array.isArray(config.urls)) {
        throw {notfound: true};
    }
    
    for each (var urlEntry in config.urls) {
        if (log.isDebugEnabled) log.debug("checking url line: " + urlEntry);
        var match = getPattern(urlEntry).exec(path);
        if (log.isDebugEnabled) log.debug("got match: " + match);

        if (match) {
            var module = getModule(urlEntry);
            if (log.isDebugEnabled) log.debug("module: " + module);
            // cut matching prefix from path and remove leading and trailing slashes
            path = path.substring(match[0].length).replace(/^\/+|\/+$/g, "");
            // add matching pattern to actionPath
            actionPath.push(match[0]);
            // prepare action arguments, adding regexp capture groups if any
            var args = [req].concat(match.slice(1));
            // lookup action in module
            var action = getAction(module, splitPath(path), actionPath, args);
            // log.debug("got action: " + action);

            if (typeof action == "function") {
                // make sure request path has trailing slash
                if (!path && match.slice(1).join('').length == 0) {
                    req.checkTrailingSlash();
                }
                req.actionPath =  actionPath.join("/").replace(/\/+/g, "/");
                var res = action.apply(module, args);
                if (res && typeof res.close === 'function') {
                    return res.close();
                }
                return res;
            } else if (Array.isArray(module.urls)) {
                // make sure request path has trailing slash
                if (!path && match.slice(1).join('').length == 0) {
                    req.checkTrailingSlash();
                }
                return resolveInConfig(req, module, actionPath, path);
            } else {
                throw {notfound: true};
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

function getModule(spec) {
    var module = spec[1];
    if (typeof module == "string") {
        module = require(module);
    } else if (!(module instanceof Object)) {
        throw Error("Module must be a string or object");
    }
    return module;
}

function getAction(module, path, actionPath, args) {
    var action, name = path[0];
    if (name) {
        action = module[name.replace(/\./g, "_")];
        if (typeof action == "function") {
            // If the request path contains additional elements check whether the
            // candidate function has formal arguments to take them
            if (path.length <= 1 || args.length + path.length - 1 <= action.length) {
                actionPath.push(name);
                Array.prototype.push.apply(args, path.slice(1));
                return action;
            }
        }
    }
    action = module["index"];
    if (typeof action == "function") {
        if (path.length == 0 || args.length + path.length <= action.length) {
            Array.prototype.push.apply(args, path);
            return action;
        }
    }
    return null;
}

function splitPath(path) {
    //remove leading and trailing slashes and split
    var array = path.split(/\/+/);
    return array.length == 1 && array[0] == "" ? [] : array;
}

/**
 * Try to load the configuration module.
 * @param configModuleName optional module name, default is 'config'
 */
function getConfig(configModuleName) {
    configModuleName = configModuleName || 'config';
    return require(configModuleName);
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
