/**
 * @fileoverview A JS interface to the Rhino parser.
 */

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
};

function getParser() {
    var ce = new org.mozilla.javascript.CompilerEnvirons();
    ce.setRecordingComments(true);
    ce.setRecordingLocalJsDocComments(true);
    ce.initFromContext(Context.getCurrentContext());
    return new org.mozilla.javascript.Parser(ce, ce.getErrorReporter());
}


