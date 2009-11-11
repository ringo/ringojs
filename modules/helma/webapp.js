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
    if (log.debugEnabled){
        log.debug('got config: ' + config.toSource());
    }

    var webenv = require('helma/webapp/env');
    webenv.env = env;
    var req = webenv.req = new Request(env);
    var res = null;

    req.charset = config.charset || 'utf8';

    // URI-decode path-info
    req.pathInfo = decodeURI(req.pathInfo);
    // remember current scriptname as application root as scriptName will be
    // set to actual script by resolveInConfig().
    req.rootPath = req.scriptName;

    try {
        res = resolveInConfig(req, config);
    } catch (e if e.redirect) {
        return new RedirectResponse(e.redirect);
    }
    return res;
}

function resolveInConfig(req, config) {
    if (log.debugEnabled) {
        log.debug('resolving path ' + req.pathInfo);
    }
    // set config property in webapp env module
    var webenv = require('helma/webapp/env');
    webenv.addConfig(config);

    if (!Array.isArray(config.urls)) {
        throw {notfound: true};
    }

    var path = req.pathInfo.replace(/^\/+|\/+$/g, "");
    
    for each (var urlEntry in config.urls) {
        if (log.debugEnabled) {
            log.debug("checking url line: " + urlEntry);
        }
        var match = getPattern(urlEntry).exec(path);
        if (log.debugEnabled) {
            log.debug("got match: " + match);
        }

        if (match) {
            var module = getModule(urlEntry);
            if (log.debugEnabled) {
                log.debug("module: " + module);
            }
            // move matching path fragment from PATH_INFO to SCRIPT_NAME
            req.appendToScriptName(match[0]);
            // prepare action arguments, adding regexp capture groups if any
            var args = [req].concat(match.slice(1));
            // lookup action in module
            var action = getAction(req, module, args);
            // log.debug("got action: " + action);
            if (typeof action == "function") {
                var res = action.apply(module, args);
                if (res && typeof res.close === 'function') {
                    return res.close();
                }
                return res;
            } else if (Array.isArray(module.urls)) {
                return resolveInConfig(req, module);
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

function getAction(req, module, args) {
    var path = splitPath(req.pathInfo);
    var action, name = path[0];
    if (name) {
        action = module[name.replace(/\./g, "_")];
        if (typeof action == "function") {
            // If the request path contains additional elements check whether the
            // candidate function has formal arguments to take them
            if (path.length <= 1 || args.length + path.length - 1 <= action.length) {
                req.appendToScriptName(name);
                Array.prototype.push.apply(args, path.slice(1));
                return action;
            }
        }
    }
    action = module["index"];
    if (typeof action == "function") {
        if (path.length == 0 || args.length + path.length <= action.length) {
            if (args.slice(1).join('').length == 0) {
                req.checkTrailingSlash();
            }            
            Array.prototype.push.apply(args, path);
            return action;
        }
    }
    return null;
}

function splitPath(path) {
    //remove leading and trailing slashes and split
    var array = path.replace(/^\/+|\/+$/g, "").split(/\/+/);
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
