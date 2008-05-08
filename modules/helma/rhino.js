/**
 * A module to access and manipulate the rhino engine running this application
 */

// mark this module as shared between all requests
var __shared__ = true;

/**
 * Set this rhino engine up for a web application, registering the standard classes
 * for request, response, session host objects.
 */
function initWebApp() {
    // set up standard web app host objects
    addHostObject(org.helma.web.ScriptableRequest);
    addHostObject(org.helma.web.ScriptableResponse);
    addHostObject(org.helma.web.ScriptableSession);
    addHostObject(org.helma.template.MacroTag);
    // register a request listener that automatically sets rhino optimization
    // level to -1 for requests that have a helma_continuation parameter.
    addRequestListener('continuation-support', function(req) {
        if (req && req.params.helma_continuation != null) {
            setRhinoOptimizationLevel(-1);
        }
    });
}

function addHostObject(javaClass) {
    getRhinoEngine().defineHostClass(javaClass);
}

function extendJavaClass(javaClass) {
    return getRhinoEngine().getExtendedClass(javaClass);
}

function addRequestListener(name, func) {
    getRhinoEngine().addRequestListener(name, func);
}

function removeRequestListener(name) {
    getRhinoEngine().removeRequestListener(name);
}

function setRhinoOptimizationLevel(level) {
    getRhinoContext().setOptimizationLevel(level);    
}

function getRhinoContext() {
    var Context = org.mozilla.javascript.Context;
    return Context.getCurrentContext();
}

function getRhinoEngine() {
    return getRhinoContext().getThreadLocal("engine");
}