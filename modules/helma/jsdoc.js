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

exports.isName = function(node) {
    return node instanceof org.mozilla.javascript.ast.Name;
}

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
