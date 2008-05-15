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
    addHostObject(org.helma.web.Request);
    addHostObject(org.helma.web.Response);
    addHostObject(org.helma.web.Session);
    addHostObject(org.helma.template.MacroTag);
    // register a request listener that automatically sets rhino optimization
    // level to -1 for requests that have a helma_continuation parameter.
    addCallback('onRequest', 'continuation-support', function(req) {
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

/**
 * Register a callback handler function that can be called via invokeCallback().
 * @param name the name of the handler
 * @param func the handler function
 */
function addCallback(event, name, func) {
    getRhinoEngine().addCallback(event, name, func);
}

/**
 * Remove a callback handler function that was previously registered.
 * @param name the name of the handler
 */
function removeCallback(event, name) {
    getRhinoEngine().removeCallback(event, name);
}

/**
 * Invoke a callback, failing silently if no callback is registered with this name.
 * @param event the callback event
 * @param thisObj the object to invoke the callback on, or null
 * @param args the callback argument array
 */
function invokeCallback(event, thisObj, args) {
    getRhinoEngine().invokeCallback(event, thisObj, args);
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