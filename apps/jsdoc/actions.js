include('helma/webapp/response');
include('helma/engine');
include('helma/jsdoc');
require('core/array');

var log = require('helma/logging').getLogger(module.id);

exports.index = function index(req, module) {
    var repo = new ScriptRepository(getRepositories()[1]);
    if (module && module != "/") {
        var jsdoc = [];
        var res = repo.getScriptResource(module);
        var currentDoc;
        var exported = [];
        parseScriptResource(res, function(node) {
            // loop through all comments looking for dangling jsdocs
            if (node.type == Token.SCRIPT) {
                for each (var comment in node.comments.toArray()) {
                    if (comment.commentType == Token.CommentType.JSDOC) {
                        log.info("found jsdoc comment: " + comment.value);
                    }
                }
            }
            // export("foo")
            if (node.type == Token.CALL && node.target.type == Token.NAME && node.target.string == "export") {
                for each (var arg in ScriptableList(node.arguments)) {
                    if (arg.type == Token.STRING) exported.push(arg.value);
                }
            }
            // var foo = exports.foo = bar
            if (node.type == Token.VAR || node.type == Token.LET) {
                for each (var n in ScriptableList(node.variables)) {
                    if (n.initializer && n.initializer.type == Token.ASSIGN)
                        checkExports(n.initializer, node.jsDoc);
                }
            }
            // exports.foo = bar
            if (node.type == Token.ASSIGN) {
                checkExports(node, node.jsDoc);
            }
            if (node.jsDoc) {
                currentDoc = extractTags(node.jsDoc)
                // log.info(getTypeName(node) + " // " + getName(node));
                // log.info(currentDoc[0][1]);
                jsdoc.push(currentDoc);
            } else {
                // log.info(getTypeName(node) + " // " + getName(node));
                if (isName(node) && getName(node) != "exports" && currentDoc && !currentDoc.name) {
                    Object.defineProperty(currentDoc, 'name', {value: getName(node)});
                }
            }
            return true;
        });
        log.info("export()ed symbols: " + exported);
        return new SkinnedResponse(getResource('./skins/module.html'), {
            title: "Module " + res.moduleName,
            jsdoc: jsdoc
        });
    } else {
        var modules = repo.getScriptResources(true).sort(function(a, b) {
            return a.relativePath > b.relativePath ? 1 : -1;
        });
        return new SkinnedResponse(getResource('./skins/index.html'), {
            title: "API Documentation",
            modules: modules
        });
    }
}

function checkExports(node, jsdoc) {
    if (node.type == Token.ASSIGN) {
        if (node.left.type == Token.GETPROP
                && node.left.target.type == Token.NAME
                && node.left.target.string == "exports") {
            // exports.foo = bar
            log.info(node.left.property.string + ": " + jsdoc);
        } else if (node.left.type == Token.GETELEM
                && node.left.target.type == Token.NAME
                && node.left.target.string == "exports"
                && node.left.element.type == Token.STRING) {
            // exports["foo"] = bar
            log.info(node.left.element.value + ": " + jsdoc);
        }
    }

}
