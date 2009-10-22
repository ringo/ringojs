include('helma/webapp/response');
include('helma/engine');
include('helma/jsdoc');
require('core/array');
require('core/string');

var log = require('helma/logging').getLogger(module.id);

var exportedFunction;
var exportedName;

exports.index = function index(req, module) {
    var repo = new ScriptRepository(getRepositories()[1]);
    if (module && module != "/") {
        var jsdoc = [];
        var res = repo.getScriptResource(module);
        var currentDoc;
        var exported = [];
        parseScriptResource(res, function(node) {
            // loop through all comments looking for dangling jsdocs
            if (node.type == Token.SCRIPT && node.comments) {
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
            // check for Object.defineProperty(foo, bar, {})
            if (node.type == Token.CALL && node.target.type == Token.GETPROP) {
                var getprop = node.target;
                if (getprop.target.type == Token.NAME && getprop.target.string == "Object"
                        && getprop.property.string == "defineProperty") {
                    var args = ScriptableList(node.arguments);
                    var propname = nodeToString(args[0]) + "." + nodeToString(args[1]);
                    log.info("Object.defineProperty: " + propname);
                }
            }
            // exported function
            if (node.type == Token.FUNCTION && exported.contains(node.name)) {
                log.info("found exported function " + node.name + ": " + node.jsDoc);
                exportedFunction = node;
                exportedName = node.name;
            }
            // var foo = exports.foo = bar
            if (node.type == Token.VAR || node.type == Token.LET) {
                for each (var n in ScriptableList(node.variables)) {
                    if (n.initializer && n.initializer.type == Token.ASSIGN)
                        checkAssignment(n.initializer, node, exported);
                }
            }
            // exports.foo = bar
            if (node.type == Token.ASSIGN) {
                checkAssignment(node, node, exported);
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

function checkAssignment(node, root, exported) {
    if (node.type == Token.ASSIGN) {
        if (node.left.type == Token.GETPROP) {
            var target = node.left.target;
            var name = node.left.property.string;
            var propname = nodeToString(node.left);
            if (propname.startsWith('exports.') && !exported.contains(name)) {
                log.info(propname + ": " + root.jsDoc);
                exported.push(name);
                if (node.right.type == Token.FUNCTION) {
                    exportedFunction = node.right;
                    exportedName = name;
                }
                return;
            } else if (target.type == Token.THIS) {
                if (root.parent && root.parent.parent && root.parent.parent.parent
                        &&  root.parent.parent.parent == exportedFunction) {
                    log.info("this/proto: " + exportedName + ".prototype." + name);
                    /* if (node.right.type == Token.FUNCTION) {
                        exportedFunction = node.right;
                        exportedName = exportedName + ".prototype." + name;
                    } */
                } else if (exported.contains(name)) {
                    log.info("found expo this " + name + " --> " + root.jsDoc);
                }
            }
        } else if (node.left.type == Token.GETELEM
                && node.left.target.type == Token.NAME
                && node.left.target.string == "exports"
                && node.left.element.type == Token.STRING) {
            // exports["foo"] = bar
            log.info(node.left.element.value + ": " + root.jsDoc);
        }
    }
}

function nodeToString(node) {
    if (node.type == Token.GETPROP) {
        return [nodeToString(node.target), node.property.string].join('.');
    } else if (node.type == Token.NAME) {
        return node.string;
    } else if (node.type == Token.STRING) {
        return node.value;
    } else {
        return getTypeName(node);
    }
}
