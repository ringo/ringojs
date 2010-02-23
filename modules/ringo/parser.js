/**
 * @fileoverview This module provides an interface to the Rhino parser.
 */

/**
 * Parse a script resource and return its AST tree.
 * @param {Resource} resource an instance of org.ringojs.repository.Resource
 * @return {AstNode} the root node of the AST tree, an instance of org.mozilla.javascript.ast.AstRoot
 */
exports.parseScriptResource = function(resource) {
    return getParser().parse(resource.content, resource.name, 0);
};

/**
 * Parse a script resource and apply the visitor function to its AST tree.
 * The function takes one argument which is a org.mozilla.javascript.ast.AstNode.
 * The function must return true to visit child nodes of the current node.
 * @param {Resource} resource an instance of org.ringojs.repository.Resource
 * @param {Function} visitorFunction the visitor function
 */
exports.visitScriptResource = function(resource, visitorFunction) {
    var ast = getParser().parse(resource.content, resource.name, 0);
    ast.visit(new org.mozilla.javascript.ast.NodeVisitor({
        visit: visitorFunction
    }));
};

function getParser() {
    var ce = new org.mozilla.javascript.CompilerEnvirons();
    ce.setRecordingComments(true);
    ce.setRecordingLocalJsDocComments(true);
    ce.initFromContext(org.mozilla.javascript.Context.getCurrentContext());
    return new org.mozilla.javascript.Parser(ce, ce.getErrorReporter());
}


