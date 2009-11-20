include('helma/webapp/response');
include('helma/jsdoc');
require('core/array');
var Buffer = require('helma/buffer').Buffer;

var log = require('helma/logging').getLogger(module.id);

exports.jsdoc = function index(req, module) {
    var repo = new ScriptRepository(require.paths.peek());
    if (module && module != "/") {
        var res = repo.getScriptResource(module);
        var jsdoc = parseResource(res);
        // log.info("export()ed symbols: " + exported);
        return new SkinnedResponse(getResource('./skins/module.html'), {
            title: "Module " + res.moduleName,
            jsdoc: jsdoc
        });
    } else {
        var modules = repo.getScriptResources(true).filter(function(r) {
            return r.relativePath.indexOf('test') != 0;
        }).sort(function(a, b) {
            return a.relativePath > b.relativePath ? 1 : -1;
        });
        return new SkinnedResponse(getResource('./skins/index.html'), {
            title: "API Documentation",
            renderList: function() {
                var previous = [];
                var buffer = new Buffer('<ul class="apilist">');
                for each (var module in modules) {
                    var path = module.moduleName.split('/');
                    var k = 0;
                    for (var i = 0; i < previous.length - 1; i++) {
                        if (previous[i] == path[i]) {
                             k = i + 1;
                        } else if (i < previous.length - 1) {
                            buffer.writeln('</ul></li>');
                        }
                    }
                    while(k < path.length - 1) {
                        if (path[k] != previous[k]) {
                            buffer.writeln('<li>', path[k], '</li>');
                        }
                        k += 1;
                        buffer.writeln('<li><ul class="apilist">');
                    }
                    var label = '<a href="' + module.relativePath + '">' + path.peek() + '</a>';
                    buffer.writeln('<li>', label, '</li>');                    
                    previous = path;
                }
                for (var z = 0; z < previous.length; z++) {
                    buffer.writeln('</ul></li>');                    
                }
                return buffer;
            }
        });
    }
}


