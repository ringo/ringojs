/*
 * The webapp module provides support for building web applications in RingoJS.
 */

// import modules
var strings = require('ringo/utils/strings');
var {Request} = require('ringo/webapp/request');
var {Response} = require('ringo/webapp/response');
var system = require('system');
var files = require('ringo/utils/files');
var daemon = require('ringo/webapp/daemon');
var webenv = require('ringo/webapp/env');

export('getConfig',
       'handleRequest',
       'main');

var log = require('ringo/logging').getLogger(module.id);

/**
 * Handler function called by the JSGI servlet.
 *
 * @param req the JSGI 0.3 request object
 */
function handleRequest(req) {
    // get config and apply it to req, res
    var configId = req.env.ringo_config || 'config';
    var config = getConfig(configId);
    if (log.isDebugEnabled()){
        log.debug('got config', config);
    }

    req = Request(req);
    req.charset = config.charset || 'utf8';
    // URI-decode path-info
    req.pathInfo = decodeURI(req.pathInfo);
    // set current request in webapp env module
    webenv.setRequest(req);

    try {
        return resolveInConfig(req, config, configId);
    } catch (e if e.redirect) {
        return Response.redirect(e.redirect);
    } finally {
        webenv.reset();
    }
}

function resolveInConfig(req, config, configId) {
    log.debug('resolving path {}', req.pathInfo);
    // set rootPath to the root context path on which this app is mounted
    // in the request object and config module, appPath to the path within the app.
    req.rootPath = config.rootPath = req.scriptName + '/';
    req.appPath = config.appPath = req.path.substring(req.rootPath.length);
    // set config property in webapp env module
    webenv.pushConfig(config, configId);

    if (!Array.isArray(config.urls)) {
        log.info("No URL mapping defined (urls is " + config.urls + "), throwing 404.");
        throw {notfound: true};
    }

    for each (var urlEntry in config.urls) {
        if (!Array.isArray(urlEntry) || urlEntry.length < 2) {
            log.info("Ignoring unsupported URL mapping: " + urlEntry);
            continue;
        }
        log.debug("checking url line: {} against {}", urlEntry, req.pathInfo);
        var match = getPattern(urlEntry).exec(req.pathInfo);
        log.debug("got match: {}", match);

        if (match) {
            var moduleId = resolveId(configId, urlEntry);
            var module = getModule(moduleId);
            log.debug("Resolved module: {} -> {}", moduleId, module);
            // move matching path fragment from PATH_INFO to SCRIPT_NAME
            var remainingPath = getRemainingPath(req, match[0]);
            // prepare action arguments, adding regexp capture groups if any
            var args = [req].concat(match.slice(1));
            // lookup action in module
            var action = getAction(req, module, urlEntry, remainingPath, args);
            // log.debug("got action: " + action);
            if (typeof action == "function") {
                return action.apply(module, args);
            } else if (Array.isArray(module.urls)) {
                shiftPath(req, remainingPath);
                return resolveInConfig(req, module, moduleId);
            }
        }
    }
    throw { notfound: true };
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

function resolveId(parent, spec) {
    var moduleId = spec[1];
    if (typeof moduleId == "string") {
        return files.resolveId(parent, moduleId);
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

function getAction(req, module, urlconf, remainingPath, args) {
    var path = splitPath(remainingPath);
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
                // actions may be specific to HTTP methods:
                // { GET: function()..., POST: function()... };
                if (action && typeof action[req.method] == "function") {
                    action = action[req.method];
                }
                if (typeof action == "function") {
                    // If the request path contains additional elements check whether the
                    // candidate function has formal arguments to take them
                    if (path.length <= 1 || args.length + path.length - 1 <= action.length) {
                        shiftPath(req, remainingPath);
                        shiftPath(req, getRemainingPath(req, name));
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
    // check for HTTP method specific action
    if (action && typeof action[req.method] == "function") {
        action = action[req.method];
    }
    if (typeof action == "function") {
        // insert predefined arguments if defined in url-conf
        if (urlconf.length > 3) {
            var spliceArgs = [1, 0].concat(urlconf.slice(3));
            Array.prototype.splice.apply(args, spliceArgs);
        }
        if (path.length == 0 || args.length + path.length <= action.length) {
            shiftPath(req, remainingPath);
            if (path.length == 0 && args.slice(1).join("").length == 0) {
                checkTrailingSlash(req);
            }
            Array.prototype.push.apply(args, path);
            return action;
        }
    }
    return null;
}

function checkTrailingSlash(req) {
    // only redirect for GET requests
    if (!strings.endsWith(req.path, "/") && req.isGet) {
        var path = req.queryString ?
                req.path + "/?" + req.queryString : req.path + "/";
        throw {redirect: path};
    }
}

function getRemainingPath(req, fragment) {
    var path = req.pathInfo;
    var pos = path.indexOf(fragment);
    return  (pos > -1) ? path.substring(pos + fragment.length) : path;
}

function shiftPath(req, remainingPath) {
    var path = req.pathInfo;
    // add matching pattern to script-name
    req.scriptName += path.substring(0, path.length - remainingPath.length);
    // ... and remove it from path-info    
    req.pathInfo = remainingPath;
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
 * Main webapp startup function.
 * @param {String} path optional path to the web application directory or config module.
 */
function main(path) {
    // parse command line options
    var cmd = system.args.shift();
    try {
        var options = daemon.parseOptions(system.args, {
            app: "app",
            config: "config"
        });
    } catch (error) {
        print(error);
        require("ringo/shell").quit();
    }

    if (options.help) {
        print("Usage:");
        print("", cmd, "[OPTIONS]", "[PATH]");
        print("Options:");
        print(daemon.getHelp());
        require("ringo/shell").quit();
    }

    // if no explicit path is given use first command line argument
    path = path || system.args[0];
    var fs = require("fs");
    if (path && fs.exists(path)) {
        if (fs.isFile(path)) {
            // if argument is a file use it as config module
            options.config = fs.base(path);
            path = fs.directory(path);
        }
    } else {
        path = ".";
    }
    // prepend the web app's directory to the module search path
    require.paths.unshift(path);

    // logging module is already loaded and configured, check if webapp provides
    // its own log4j configuration file and apply it if so.
    if (fs.isFile(fs.join(path, "config", "log4j.properties"))) {
        require("./logging").setConfig(getResource('config/log4j.properties'));
    }

    daemon.init();
    daemon.start();
}

var started; // protect against restarting on reload
if (require.main == module && !started) {
    main();
    started = true;
}
