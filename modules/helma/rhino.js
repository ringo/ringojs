/**
 * A module to access and manipulate the rhino engine running this application
 */

importModule('core.object');
importModule('helma.logging', 'logging');
var log = logging.getLogger(__name__);

// mark this module as shared between all requests
var __shared__ = true;

/**
 * Set this rhino engine up for a web application, registering the standard classes
 * for request, response, session host objects.
 */
function initWebApp() {
    log.info('Initializing web app host objects');
    // set up standard web app host objects
    addHostObject(org.helma.web.Request);
    addHostObject(org.helma.web.Response);
    addHostObject(org.helma.web.Session);
    addHostObject(org.helma.template.MacroTag);
    // register a request listener that automatically sets rhino optimization
    // level to -1 for requests that have a helma_continuation parameter.
    addCallback('onInvoke', 'continuation-support', function(req) {
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

/**
 * Set the Rhino optimization level for the current thread and context.
 * The optimization level is an integer between -1 (interpreter mode)
 * and 9 (compiled mode, all optimizations enabled). The default level
 * is 0.
 * @param level an integer between -1 and 9
 */
function setRhinoOptimizationLevel(level) {
    getRhinoContext().setOptimizationLevel(level);    
}

/**
 * Evaluate a module script on an existing scope instead of creating a
 * new module scope. This can be used to mimic traditional JavaScript
 * environments such as those found in web browsers.
 * @param moduleName the name of the module to evaluate
 * @param scope the JavaScript object to evaluate the script on
 */
function evaluate(moduleName, scope) {
    if (!scope) {
        // create a new top level scope object
        scope = {};
        scope.__parent__ = null;
        scope.__proto__ = Object.__parent__;
    }
    getRhinoEngine()
            .getScript(moduleName)
            .evaluate(scope, getRhinoContext());
    return scope;
}

/**
 * Get the org.mozilla.javascript.Context associated with the current thread.
 */
function getRhinoContext() {
    var Context = org.mozilla.javascript.Context;
    return Context.getCurrentContext();
}

/**
 * Get the org.helma.javascript.RhinoEngine associated with this application.
 */
function getRhinoEngine() {
    return getRhinoContext().getThreadLocal("engine");
}

var args = new ScriptableList(getRhinoEngine().getCommandLineArguments());
var path = new ScriptableList(getRhinoEngine().getRepositories());
// make properties read-only
this.readOnly('args', 'path');
