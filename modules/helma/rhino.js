/**
 * A module to access and manipulate the rhino engine running this application
 */

// mark this module as shared between all requests
var __shared__ = true;

function addHostObject(javaClass) {
    getRhinoEngine().defineHostClass(javaClass);
}

function addStandardHostObjects() {
    addHostObject(org.helma.web.ScriptableRequest);
    addHostObject(org.helma.web.ScriptableResponse);
    addHostObject(org.helma.web.ScriptableSession);
    addHostObject(org.helma.template.MacroTag);    
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