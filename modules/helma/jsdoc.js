require('core/string');
require('core/array');
include('helma/file');
include('helma/parser');
importPackage(org.mozilla.javascript);
importPackage(org.helma.repository);

var log = require('helma/logging').getLogger(module.id);

var standardObjects = [
    'Array', 'Object', 'String', 'Date', 'Number', 'RegExp', 'Boolean'
];

/**
 * Create a script repository for the given path
 * @param {String} path the base path
 * @return an script repository
 */
exports.ScriptRepository = function(path) {
    return new ScriptRepository(path);
};

function ScriptRepository(path) {
    var repo = path instanceof Repository ?
               path : new FileRepository(new java.io.File(path));

    /**
     * Get a list of script resources (files with a .js extension) in this
     * repository.
     * @param {Boolean} nested whether to return scripts in nested directories
     * @return {Array} list of script files as Helma Resource objects
     */
    this.getScriptResources = function(nested) {
        var list = repo.getResources(Boolean(nested));
        return list.filter(function(r) {return r.name.endsWith('.js');});
    };

    /**
     * Get a script resource contained in this repository.
     * @param {String} path the script path
     * @return {Resource} the script resource
     */
    this.getScriptResource = function(path) {
        return repo.getResource(path);
    };

}

exports.parseResource = function(resource) {
    var exportedFunction;
    var exportedName;
    var exported = [];
    var jsdocs = [];
    var seen = {};
    
    var checkAssignment = function(node, root, exported) {
        if (node.type == Token.ASSIGN) {
            if (node.left.type == Token.GETPROP) {
                var target = node.left.target;
                var name = node.left.property.string;
                var propname = nodeToString(node.left);
                if (propname.startsWith('exports.') && !exported.contains(name)) {

                    addDocItem(name, root.jsDoc, node.right);
                    exported.push(name);
                    if (node.right.type == Token.FUNCTION) {
                        exportedFunction = node.right;
                        exportedName = name;
                    }
                } else if (target.type == Token.THIS) {
                    if (root.parent && root.parent.parent && root.parent.parent.parent
                            &&  root.parent.parent.parent == exportedFunction) {
                        addDocItem(exportedName + ".instance." + name, root.jsDoc, node.right);
                        /* if (node.right.type == Token.FUNCTION) {
                         exportedFunction = node.right;
                         exportedName = exportedName + ".prototype." + name;
                         } */
                    } else if (exported.contains(name)) {
                        addDocItem(name, root.jsDoc, node.right);
                    }
                } else {
                    var chain = propname.split(".");
                    if (exported.contains(chain[0])) {
                        // Foo.bar or Foo.prototype.bar assignment where Foo is exported
                        addDocItem(propname, root.jsDoc, node.right);
                    }
                }
            } else if (node.left.type == Token.GETELEM
                    && node.left.target.type == Token.NAME
                    && node.left.target.string == "exports"
                    && node.left.element.type == Token.STRING) {
                // exports["foo"] = bar
                addDocItem(node.left.element.value, root.jsDoc, node.right);
            }
        }
    };

    var addDocItem = function(name, jsdoc, value) {
        jsdoc = extractTags(jsdoc);
        if (!name) {
            name = jsdoc.getTag("name");
            var memberOf = jsdoc.getTag("memberOf");
            if (memberOf) {
                name = memberOf + "." + name;
            }
        }
        if (!seen[name]) {
            jsdoc.name = name;
            if ((value && value.type == Token.FUNCTION)
                    || jsdoc.getTag("function") != null
                    || jsdoc.getTag("param") != null
                    || jsdoc.getTag("returns") != null
                    || jsdoc.getTag("constructor") != null) {
                jsdoc.isFunction = true;
            }
            if (jsdoc.getTag("constructor") != null
                    || jsdoc.getTag("class") != null) {
                jsdoc.isClass = true;
            }
            jsdocs.push(jsdoc);
            seen[name] = true;
        }
    };

    visitScriptResource(resource, function(node) {
        // loop through all comments looking for dangling jsdocs
        if (node.type == Token.SCRIPT && node.comments) {
            for each (var comment in node.comments.toArray()) {
                if (comment.commentType == Token.CommentType.JSDOC) {
                    if (/@fileoverview\s/.test(comment.value)) {
                        Object.defineProperty(jsdocs, "fileoverview", {
                            value: extractTags(comment.value)
                        });
                    } else if (/@name\s/.test(comment.value)) {
                        // JSDoc comments that have an explicit @name tag are used as is
                        // without further AST introspection. This can be used to document
                        // APIS that have no corresponding code, e.g. native host methods
                        addDocItem(null, comment.value);
                    }
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
                var target = nodeToString(args[0]).split('.');
                var jsdoc, value;
                // rhino puts jsdoc on the first name of the third argument object literal (property descriptor)
                if (args[2] && args[2].elements) {
                    var left = args[2].elements.get(0).left;
                    jsdoc = left.jsDoc;
                    if (nodeToString(left) == "value") {
                        value = args[2].elements.get(0).right;
                    }
                }
                if (exported.contains(target[0]) || standardObjects.contains(target[0])) {
                    target.push(nodeToString(args[1]));
                    addDocItem(target.join('.'), jsdoc, value);
                } else if (target[0] == 'this' && exportedFunction != null) {
                    target[0] = exportedName;
                    target.push('instance', nodeToString(args[1]));
                    addDocItem(target.join('.'), jsdoc, value);
                }
            }
        }
        // exported function
        if (node.type == Token.FUNCTION && exported.contains(node.name)) {
            addDocItem(node.name, node.jsDoc, node);
            exportedFunction = node;
            exportedName = node.name;
        }
        // var foo = exports.foo = bar
        if (node.type == Token.VAR || node.type == Token.LET) {
            for each (var n in ScriptableList(node.variables)) {
                if (n.target.type == Token.NAME && exported.contains(n.target.string)) {
                    addDocItem(n.target.string,  node.jsDoc);
                } else if (n.initializer && n.initializer.type == Token.ASSIGN) {
                    checkAssignment(n.initializer, node, exported);
                }
            }
        }
        // exports.foo = bar
        if (node.type == Token.ASSIGN) {
            checkAssignment(node, node, exported);
        }

        return true;
    });

    return jsdocs.sort(function(a, b) {
        return a.name < b.name ? -1 : 1;
    });
};

/**
 * Remove slash-star comment wrapper from a raw comment string.
 * @type String
 */
exports.unwrapComment = function(/**String*/comment) {
    return comment ? comment.replace(/(^\/\*\*|\*\/$)/g, "").replace(/^\s*\* ?/gm, "") : "";
};

/**
 * Parse a JSDoc comment into an object wrapping an array of tags as [tagname, tagtext]
 * and getTag() and getTags() methods to lookup specific tags.
 * @param {String} comment the raw JSDoc comment
 * @return {Object} an array of tags.
 */
var extractTags = exports.extractTags = function(/**String*/comment) {
    if (!comment) {
        comment = "";
    } else if (comment.startsWith("/**")) {
        comment = exports.unwrapComment(comment);
    }
    var tags = comment.split(/(^|[\r\n])\s*@/)
            .filter(function($){return $.match(/\S/)});
    tags = tags.map(function(tag, idx) {
        if (idx == 0 && !comment.startsWith('@')) {
            return ['desc', tag.trim()];
        } else {
            var space = tag.search(/\s/);
            return space > -1 ?
                   [tag.substring(0, space), tag.substring(space + 1).trim()] :
                   [tag, ''];
        }
    });
    return Object.create(docProto, {
        tags: {value: tags}
    });
};

// the prototype used for document items
var docProto = {
    getTag: function(name) {
        for (var i = 0; i < this.tags.length; i++) {
            if (this.tags[i][0] == name) return this.tags[i][1];
        }
        return null;
    },
    getTags: function(name) {
        var result = [];
        for (var i = 0; i < this.tags.length; i++) {
            if (this.tags[i][0] == name) result.push(this.tags[i][1]);
        }
        return result;
    },
    addTag: function(name, value) {
        this.tags.push([name, value]);
    }
};

/**
 * Utility function to test whether a node is a Name node
 * (a node of type org.mozilla.javascript.ast.Name)
 * @param {Object} node an AST node
 * @return {Boolean} true if node is a name node
 */
var isName = exports.isName = function(node) {
    return node instanceof org.mozilla.javascript.ast.Name;
};

/**
 * Utility function to get the name value of a node, or the empty
 * string if it is not a name node.
 * @param {AstNode} node an AST node
 * @return {String} the name value of the node
 */
var getName = exports.getName = function(node) {
    return exports.isName(node) ? node.getString() : "";
};

var getTypeName = exports.getTypeName = function(node) {
    return node ? org.mozilla.javascript.Token.typeToName(node.getType()) : "" ;
};

var nodeToString = function(node) {
    if (node.type == Token.GETPROP) {
        return [nodeToString(node.target), node.property.string].join('.');
    } else if (node.type == Token.NAME) {
        return node.string;
    } else if (node.type == Token.STRING) {
        return node.value;
    } else if (node.type == Token.THIS) {
        return "this";
    } else {
        return getTypeName(node);
    }
};

/**
 * Export org.mozilla.javascript.Token to allow for easy type checking on AST nodes:
 *
 *     node.type == Token.NAME
 */
exports.Token = org.mozilla.javascript.Token;
