include('ringo/webapp/response');
include('ringo/jsdoc');
require('core/array');
require('core/string');
var Buffer = require('ringo/buffer').Buffer;

var log = require('ringo/logging').getLogger(module.id);

exports.jsdoc = function index(req, module) {
    var repo = new ScriptRepository(require.paths.peek());
    if (module && module != "/") {
        var res = repo.getScriptResource(module + '.js');
        if (!res.exists()) {
            return notFoundResponse(req.scriptName + req.pathInfo);
        }
        var moduleDoc = parseResource(res);
        // log.info("export()ed symbols: " + exported);
        return skinResponse('./skins/jsdoc-module.html', {
            title: "Module " + res.moduleName,
            moduleName: module,
            moduleDoc: moduleDoc,
            moduleList: renderModuleList
        });
    } else {
        return skinResponse('./skins/jsdoc-overview.html', {
            title: "API Documentation",
            moduleList: renderModuleList
        });
    }
};

function renderModuleList() {
    var rootPath = require('./config').rootPath;
    var repo = new ScriptRepository(require.paths.peek());
    var modules = repo.getScriptResources(true).filter(function(r) {
        return r.moduleName != 'ringoglobal' &&  r.moduleName.indexOf('test') != 0;
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
                        path[j] : '<a href="' + rootPath + module.moduleName + '">' + path[j] + '</a>';
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
