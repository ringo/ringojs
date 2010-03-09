/*
 * The webapp module provides support for building web applications in RingoJS.
 */

// import modules
require('core/object');
require('core/string');

include('ringo/webapp/request');
include('ringo/webapp/response');

var fileutils = require('ringo/fileutils');
var Server = require('ringo/httpserver').Server;

export('start', 'stop', 'getConfig', 'getServer', 'handleRequest');

var server;
var log = require('ringo/logging').getLogger(module.id);

module.shared = true;

/**
 * Handler function called by the JSGI servlet.
 *
 * @param env the JSGI environment argument
 */
function handleRequest(env) {
    // get config and apply it to req, res
    var configId = env['ringo.config'] || 'config';
    var config = getConfig(configId);
    if (log.isDebugEnabled()){
        log.debug('got config: ' + config.toSource());
    }

    // set req in webapp env module
    var webenv = require('ringo/webapp/env');
    var req = new Request(env);
    var res = null;
    webenv.setRequest(req);

    req.charset = config.charset || 'utf8';

    // URI-decode path-info
    req.pathInfo = decodeURI(req.pathInfo);

    try {
        return resolveInConfig(req, config, configId);
    } catch (e if e.redirect) {
        return redirectResponse(e.redirect);
    }
}

function resolveInConfig(req, config, configId) {
    log.debug('resolving path {}', req.pathInfo);
    // set rootPath to the root context path on which this app is mounted
    // in the request object and config module, appPath to the path within the app.
    req.rootPath = config.rootPath = req.scriptName + '/';
    req.appPath = config.appPath = req.path.substring(req.rootPath.length);
    // set config property in webapp env module
    var webenv = require('ringo/webapp/env');
    webenv.pushConfig(config, configId);

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
        log.debug("checking url line: {}", urlEntry);
        var match = getPattern(urlEntry).exec(path);
        log.debug("got match: {}", match);

        if (match) {
            var moduleId = resolveId(configId, urlEntry);
            var module = getModule(moduleId);
            log.debug("Resolved module: {} -> {}", moduleId, module);
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
                return resolveInConfig(req, module, moduleId);
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

function resolveId(parent, spec) {
    var moduleId = spec[1];
    if (typeof moduleId == "string") {
        return fileutils.resolveId(parent, moduleId);
    } else {
        return moduleId;
    }
}

function getModule(moduleId) {
    if (typeof moduleId == "string") {
        return require(moduleId);
    } else if (!(moduleId instanceof Object)) {
        throw Error("Module must be a string or object");
    }
    return moduleId;
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
            if (path.length == 0 && args.slice(1).join('').length == 0) {
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
 * Start the web server using the given config module, or the
 * default "config" module if called without argument.
 */
function start(moduleId) {
    // start jetty http server
    moduleId = moduleId || 'config';
    var config = getConfig(moduleId);
    var httpConfig = Object.merge(config.httpConfig || {}, {
        moduleName: moduleId,
        functionName: "app"
    });

    server = server || new Server(httpConfig);
    if (Array.isArray(config.static)) {
        config.static.forEach(function(spec) {
            var dir = fileutils.resolveId(moduleId, spec[1]);
            server.addStaticResources(spec[0], null, dir);
        });
    }
    if (!server.isRunning()) {
        server.start();
    }
}

/**
 * Stop the web server.
 */
function stop() {
    // stop jetty HTTP server
    if (server && server.isRunning()) {
        server.stop();
    }
}

/**
 * Get the server instance.
 */
function getServer() {
    return server;
}

if (require.main == module) {
    for (var i = 1; i < system.args.length; i++) {
        var arg = system.args[i];
        if (arg.indexOf('-') == 0) {
            break;
        }
        require.paths.splice(require.paths.length - 2, 0, arg);
    }
    log.info('Set up module path: ' + require.paths);
    start();
}
