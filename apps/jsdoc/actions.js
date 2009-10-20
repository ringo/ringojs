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
                        // check for top level module doc
                        // log.info("found jsdoc comment: " + comment.value);
                    }
                }
            }
            // export("foo")
            if (node.type == Token.CALL && node.target.type == Token.NAME && node.target.string == "export") {
                for each (var arg in ScriptableList(node.arguments)) {
                    if (arg.type == Token.STRING) exported.push(arg.value);
                }
            }
            // exported function
            if (node.type == Token.FUNCTION && exported.contains(node.name)) {
                log.info("found exported function " + node.name + ": " + node.jsDoc);
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
                checkAssignment(node, node.jsDoc, exported);
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

function checkAssignment(node, jsdoc, exported) {
    if (node.type == Token.ASSIGN) {
        if (node.left.type == Token.GETPROP) {
            var target = node.left.target;
            var name = node.left.property.string;
            var chain = [name];
            while (target.type == Token.GETPROP) {
                chain.unshift(target.property.string);
                target = target.target;
            }
            if (target.type == Token.NAME) {
                chain.unshift(target.string);
                if (target.string == "exports") {
                    // exports.foo = bar
                    log.info(chain.join(".") + ": " + jsdoc);
                    exported.push(name);
                    return;
                }
                log.info(chain.join(".") + " --> " + exported.contains(target.string) + " // " + jsdoc);
            } else if (target.type == Token.THIS) {
                log.info("this." + name + " --> " + jsdoc);
            }
        } else if (node.left.type == Token.GETELEM
                && node.left.target.type == Token.NAME
                && node.left.target.string == "exports"
                && node.left.element.type == Token.STRING) {
            // exports["foo"] = bar
            log.info(node.left.element.value + ": " + jsdoc);
        }
    }

}
