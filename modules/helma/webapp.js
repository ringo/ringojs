/*
 * The webapp module provides support for building web applications in Helma NG.
 */

// import modules
require('core/object');
require('core/string');

include('helma/webapp/request');
include('helma/webapp/response');

var engine = require('helma/engine');
var Server = require('helma/httpserver').Server;

export('start', 'stop', 'getConfig', 'handleRequest');

var server;
var log = require('helma/logging').getLogger(module.id);

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
    // set the root context path on which this app is mounted in the config module
    config.rootPath = req.scriptName + "/";
    // set config property in webapp env module
    var webenv = require('helma/webapp/env');
    webenv.addConfig(config);

    if (!Array.isArray(config.urls)) {
        log.info("No URL mapping defined (urls is " + config.urls + "), throwing 404.");
        throw {notfound: true};
    }

    var path = req.pathInfo.replace(/^\/+|\/+$/g, "");

    for each (var urlEntry in config.urls) {
        if (!Array.isArray(urlEntry) || urlEntry.length < 2) {
            log.info("Ignoring unsupported URL mapping: " + urlEntry);
            continue;
        }
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
            var action = getAction(req, module, urlEntry, args);
            // log.debug("got action: " + action);
            if (typeof action == "function") {
                var res = action.apply(module, args);
                if (res && typeof res.close === 'function') {
                    return res.close();
                }
                return res;
            } else if (Array.isArray(module.urls)) {
                return resolveInConfig(req, module);
            }
        }
    }
    throw { notfound: true };
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

function getAction(req, module, urlconf, args) {
    var path = splitPath(req.pathInfo);
    var action;
    // if url-conf has a hard-coded action name use it
    var name = urlconf[2];
    if (typeof module === "function") {
        action = module;
    } else {
        if (!name) {
            // action name is not defined in url mapping, try to get it from the request path
            name = path[0];
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
            // no matching action, fall back to "index"
            name = "index";
        }
        action = module[name];
    }
    if (typeof action == "function") {
        // insert predefined arguments if defined in url-conf
        if (urlconf.length > 3) {
            var spliceArgs = [1, 0].concat(urlconf.slice(3));
            Array.prototype.splice.apply(args, spliceArgs);
        }
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
 * Start the jetty server using the given config module, or the
 * default "config" module if called without argument.
 */
function start(config) {
    // start jetty http server
    config = config || getConfig();
    var httpConfig = Object.merge(config.httpConfig || {}, {
        moduleName: "config",
        functionName: "app"
    });

    server = new Server(httpConfig).start();
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
