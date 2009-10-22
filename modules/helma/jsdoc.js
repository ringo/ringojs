require('core/string');
include('helma/file');
importPackage(org.mozilla.javascript);
importClass(org.helma.repository.FileRepository);
importClass(org.helma.repository.FileResource);

/**
 * Get a script repository from the given path
 * @param path {String} the base path
 * @return an script repository
 */
exports.ScriptRepository = function(path) {
    return new ScriptRepository(path);
}

function ScriptRepository(path) {
    var repo = path instanceof org.helma.repository.Repository ?
               path : new FileRepository(new java.io.File(path));

    this.getScriptResources = function(recurse) {
        var list = repo.getResources(Boolean(recurse));
        return list.filter(function(r) {return r.name.endsWith('.js');});
    }

    this.getScriptResource = function(path) {
        return repo.getResource(path);
    }

}

/**
 * Parse a script resource and apply the visitorFunction to the script's nodes.
 * The function takes one argument which is a org.mozilla.javascript.ast.AstNode.
 * The function must return true to visit child nodes of the current node.
 * @param resource {Resource} an instance of org.helma.repository.Resource
 * @param visitorFunction {Function} the visitor function
 */
exports.parseScriptResource = function(resource, visitorFunction) {
    var ast = getParser().parse(resource.content, resource.name, 0);
    ast.visit(new org.mozilla.javascript.ast.NodeVisitor({
        visit: visitorFunction
    }));
}

/**
 * Remove slash-star comment wrapper from a raw comment string.
 * @type String
 */
exports.unwrapComment = function(/**String*/comment) {
    return comment ? comment.replace(/(^\/\*\*|\*\/$)/g, "").replace(/^\s*\* ?/gm, "") : "";
}

/**
 * Parse a JSDoc comment into an array of tags, with tags being represented
 * as [tagname, tagtext].
 * @param {String} comment the raw JSDoc comment
 * @return {Array} an array of tags.
 */
exports.extractTags = function(/**String*/comment) {
    if (comment.startsWith("/**")) {
        comment = exports.unwrapComment(comment);
    }
    var tags = comment.split(/(^|[\r\n])\s*@/)
            .filter(function($){return $.match(/\S/)});
    return tags.map(function(tag, idx) {
        if (idx == 0 && !comment.startsWith('@')) {
            return ['desc', tag.trim()];
        } else {
            var space = tag.search(/\s/);
            return space > -1 ?
                   [tag.substring(0, space), tag.substring(space + 1).trim()] :
                   [tag, ''];
        }
    })
}

/**
 * Utility function to test whether a node is a Name node
 * (a node of type org.mozilla.javascript.ast.Name)
 * @param node {Object} an AST node
 * @return {Boolean} true if node is a name node
 */
exports.isName = function(node) {
    return node instanceof org.mozilla.javascript.ast.Name;
}

/**
 * Utility function to get the name value of a node, or the empty
 * string if it is not a name node.
 * @param node an AST node
 * @return {String} the name value of the node
 */
exports.getName = function(node) {
    return exports.isName(node) ? node.getString() : "";
}

exports.getTypeName = function(node) {
    return node ? org.mozilla.javascript.Token.typeToName(node.getType()) : "" ;
}

/**
 * Export org.mozilla.javascript.Token to allow for easy type checking on AST nodes:
 *
 *     node.type == Token.NAME
 */
exports.Token = org.mozilla.javascript.Token

function getParser() {
    var ce = new CompilerEnvirons();
    ce.setRecordingComments(true);
    ce.setRecordingLocalJsDocComments(true)
    ce.initFromContext(Context.getCurrentContext());
    return new Parser(ce, null);
}
