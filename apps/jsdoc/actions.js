include('ringo/webapp/response');
include('ringo/jsdoc');
require('core/array');
require('core/string');
var Buffer = require('ringo/buffer').Buffer;
var {join, base, directory, canonical} = require('fs');
var config = require('./config');
var log = require('ringo/logging').getLogger(module.id);

exports.index = function(req) {
    return skinResponse('./skins/index.html', {
        title: "API Documentation",
        packageList: renderPackageList(req)
    });
};

exports.repository = function(req, repositoryId) {
    var repository = getScriptRepository(repositoryId);
    if (!repository.exists()) {
        return notFoundResponse(req.scriptName + req.pathInfo);
    }
    return skinResponse('./skins/package.html', {
        title: "Repository " + getRepositoryName(repositoryId, repository.getPath()),
        moduleList: renderModuleList.bind(this, repositoryId, repository)
    });
};

exports.module = function(req, repositoryId, moduleId) {
    var repository = getScriptRepository(repositoryId);
    var res = repository.getScriptResource(moduleId + '.js');
    if (!res.exists()) {
        log.error(res);
        return notFoundResponse(req.scriptName + req.pathInfo);
    }
    var moduleDoc = parseResource(res);
    // log.info("export()ed symbols: " + exported);
    return skinResponse('./skins/module.html', {
        title: "Module " + res.moduleName,
        moduleName: moduleId,
        moduleDoc: moduleDoc,
        moduleList: renderModuleList.bind(this, repositoryId, repository)
    });
};

function renderModuleList(repositoryId, repository) {
    var rootPath = require('./config').rootPath;
    var modules = repository.getScriptResources(true).filter(function(r) {
        return r.moduleName != 'ringo/global' &&  r.moduleName.indexOf('test') != 0;
    }).sort(function(a, b) {
        return a.moduleName > b.moduleName ? 1 : -1;
    });
    var previous = [];
    var indent = 0;
    var buffer = new Buffer(); // '<ul class="apilist">');
    for each (var module in modules) {
        var path = module.moduleName.split('/');
        var i;
        var hasList = false;
        for (i = previous.length; i > 0; i--) {
            if (previous[i - 1] != path[i - 1]) {
                if (i < previous.length) {
                    indent -= 2;
                    buffer.writeln(' '.repeat(indent), '</ul>');
                    indent -= 2;
                }
                if (i < previous.length) {
                    buffer.write(' '.repeat(indent));
                }
                buffer.writeln('</li>');
                hasList = true;
            } else {
                break;
            }
        }
        for(var j = i; j < path.length; j++) {
            if (!hasList) {
                indent += 2;
                buffer.writeln().writeln(' '.repeat(indent), '<ul class="apilist">');
                indent += 2;
            }
            var label = j < path.length - 1 ?
                    path[j] :
                    '<a href="' + rootPath + repositoryId + '/' + module.moduleName + '">' + path[j] + '</a>';
            buffer.write(' '.repeat(indent), '<li>', label);
            hasList = false;
        }
        previous = path;
    }
    for (var z = 0; z < previous.length; z++) {
        buffer.writeln('</li>');
        indent -= 2;
        buffer.writeln(' '.repeat(indent), '</ul>');
    }
    return buffer;
}

function getScriptRepository(repositoryId) {
    return new ScriptRepository(getRepositories()[repositoryId]);
}

function getRepositories() {
    return config.scriptRepositories || require.paths;
}

function getRepositoryName(key, path) {
    // check if key is numeric
    if (+key == key) {
        // use last two path elements as anchor text
        // e.g. "ringojs/modules", "jetson/lib"
        return join(base(directory(path)), base(canonical(path)));
    }
    return key;
}

function renderPackageList(req) {
    var repos = getRepositories();
    var buffer = new Buffer();
    for (var key in repos) {
        var path = repos[key];
        var name = getRepositoryName(key, path);
        buffer.writeln('<div><a href="', req.rootPath, key, '/">',
                name, '</a></div>');
    }
    return buffer.toString();
}
