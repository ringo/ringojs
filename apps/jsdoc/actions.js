include('helma/webapp/response');
include('helma/jsdoc');
require('core/array');

var log = require('helma/logging').getLogger(module.id);

exports.index = function index(req, module) {
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
            modules: modules
        });
    }
}


