require('core/string');
importPackage(org.mozilla.javascript);

exports.dump = function(path) {
    var resources = getResources(path, true);
    if (resources.length == 0) {
        resources = [getResource(path)];
    }
    for each (var resource in resources) {
        if (!resource.name.endsWith(".js")) {
            continue;
        }
        print("PARSING", resource.path);
        try {
            var ast = getParser().parse(resource.content, resource.name, 0);
            ast.visit(new org.mozilla.javascript.ast.NodeVisitor({
                visit: function(n) {
                   if (n.jsDoc)
                       print("JSDOC: ", n.jsDoc);
                   if (n.name)
                       print("NAME: ", n.name);
                   return true;
                }
            }));
        } catch (x) {
            print("error parsing", resource, x);
        }
    }
}

function getParser() {
    var ce = new CompilerEnvirons();
    ce.setRecordingComments(true);
    ce.setRecordingLocalJsDocComments(true)
    ce.initFromContext(Context.getCurrentContext());
    return new Parser(ce, null);
}
