/**
 * @fileoverview This module provides an interface to the Rhino parser.
 */

export("Token",
       "parseScriptResource",
       "visitScriptResource",
       "isName",
       "getName",
       "getTypeName");

/**
 * The org.mozilla.javascript.Token class. This can be used to  easily check
 * find out the types of AST nodes:
 *
 *     node.type == Token.NAME
 */
var Token = org.mozilla.javascript.Token;

/**
 * Parse a script resource and return its AST tree.
 * @param {Resource} resource an instance of org.ringojs.repository.Resource
 * @param {string} encoding optional encoding to use, defaults to UTF-8
 * @return {AstNode} the root node of the AST tree, an instance of org.mozilla.javascript.ast.AstRoot
 */
function parseScriptResource(resource, encoding) {
    return getParser().parse(resource.getReader(encoding || "utf-8"), resource.name, 0);
};

/**
 * Parse a script resource and apply the visitor function to its AST tree.
 * The function takes one argument which is a org.mozilla.javascript.ast.AstNode.
 * The function must return true to visit child nodes of the current node.
 * @param {Resource} resource an instance of org.ringojs.repository.Resource
 * @param {Function} visitorFunction the visitor function
 */
function visitScriptResource(resource, visitorFunction) {
    var ast = getParser().parse(resource.content, resource.name, 0);
    ast.visit(new org.mozilla.javascript.ast.NodeVisitor({
        visit: visitorFunction
    }));
};

/**
 * Utility function to test whether a node is a Name node
 * (a node of type org.mozilla.javascript.ast.Name)
 * @param {Object} node an AST node
 * @returns {Boolean} true if node is a name node
 */
function isName(node) {
    return node.type == Token.NAME;
};

/**
 * Utility function to get the name value of a node, or the empty
 * string if it is not a name node.
 * @param {AstNode} node an AST node
 * @returns {String} the name value of the node
 */
function getName(node) {
    return exports.isName(node) ? node.getString() : "";
};

/**
 * Get the name of the token as string.
 * @param {AstNode} node a AST node
 * @returns {String} the name of the AST node
 */
function getTypeName(node) {
    return node ? org.mozilla.javascript.Token.typeToName(node.getType()) : "" ;
};

function getParser() {
    var ce = new org.mozilla.javascript.CompilerEnvirons();
    ce.setRecordingComments(true);
    ce.setRecordingLocalJsDocComments(true);
    ce.initFromContext(org.mozilla.javascript.Context.getCurrentContext());
    return new org.mozilla.javascript.Parser(ce, ce.getErrorReporter());
}


