require('core/string');
include('helma/file');
importPackage(org.mozilla.javascript);
importClass(org.helma.repository.FileRepository);
importClass(org.helma.repository.FileResource);

/**
 * Get a list of resources with the given path prefix, optionally descending into subdirectories.
 * @param path {String} the base path
 * @param recursive {Boolean} whether to descend into subdirectories
 * @return an Array of Resource objects
 */
exports.getScriptResources = function(path, recursive) {
    var file = new File(path);
    var list;
    if (!file.exists()) {
        return [];
    } else if (file.isDirectory()) {
        list = new ScriptableList(new FileRepository(file).getResources(Boolean(recursive)));
    } else {
        list = [new FileResource(new java.io.File(path))];
    }
    return list.filter(function(resource) resource.name.endsWith(".js"));
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

function getParser() {
    var ce = new CompilerEnvirons();
    ce.setRecordingComments(true);
    ce.setRecordingLocalJsDocComments(true)
    ce.initFromContext(Context.getCurrentContext());
    return new Parser(ce, null);
}
