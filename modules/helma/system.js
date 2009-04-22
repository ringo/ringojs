/**
 * A module to access and manipulate the rhino engine running this application
 */

require('core/object');

export('addHostObject',
        'addRepository',
        'createSandbox',
        'evaluate',
        'extendJavaClass',
        'getRepositories',
        'getRhinoContext',
        'getRhinoEngine',
        'getOptimizationLevel',
        'setOptimizationLevel',
        'serialize',
        'deserialize',
        'args');

var rhino = org.mozilla.javascript;

// mark this module as shared between all requests
var __shared__ = true;

function addHostObject(javaClass) {
    getRhinoEngine().defineHostClass(javaClass);
}

/**
 * Create a sandboxed scripting engine with the same install directory as this and the
 * given module paths, global properties, class shutter and sealing
 * @param modulePath the comma separated module search path
 * @param globals a map of predefined global properties, may be null
 * @param shutter a Rhino class shutter, may be null
 * @param sealed if the global object should be sealed, defaults to false
 * @return a sandboxed RhinoEngine instance
 * @throws FileNotFoundException if any part of the module paths does not exist
 */
function createSandbox(modulePath, globals, shutter, sealed) {
    if (shutter) {
        if (!(shutter instanceof rhino.ClassShutter)) {
            shutter = new rhino.ClassShutter(shutter);
        }
    } else {
        shutter = null;
    }
    sealed = Boolean(sealed);
    return getRhinoEngine().createSandbox(modulePath, globals, shutter, sealed);
}

/**
 * Get a wrapper around a java class that can be extended in javascript using
 * the ClassName.prototype property
 * @param javaClass a fully qualified java class name
 */
function extendJavaClass(javaClass) {
    return getRhinoEngine().getExtendedClass(javaClass);
}

/**
 * Get the Rhino optimization level for the current thread and context.
 * The optimization level is an integer between -1 (interpreter mode)
 * and 9 (compiled mode, all optimizations enabled). The default level
 * is 0.
 * @return level an integer between -1 and 9
 */
function getOptimizationLevel() {
    return getRhinoEngine().getOptimizationLevel();    
}

/**
 * Set the Rhino optimization level for the current thread and context.
 * The optimization level is an integer between -1 (interpreter mode)
 * and 9 (compiled mode, all optimizations enabled). The default level
 * is 0.
 * @param level an integer between -1 and 9
 */
function setOptimizationLevel(level) {
    getRhinoEngine().setOptimizationLevel(level);
}

/**
 * Serialize a JavaScript object graph to a java.io.OutputStream. If the
 * function is called without second argument the serialized object is
 * returned as byte array.
 * @param object the object to serialize
 * @param output a java.io.OutputStream
 */
function serialize(object, output) {
    if (!(output instanceof java.io.OutputStream)) {
        output = new java.io.ByteArrayOutputStream();
        getRhinoEngine().serialize(object, output);
        return output.toByteArray();
    }
    getRhinoEngine().serialize(object, output);    
}

/**
 * Deserialize a previously serialized object graph from a java.io.Inputstream
 * or a byte array.
 * @param input a InputStream or byte array containing a serialized object
 */
function deserialize(input) {
    if (!(input instanceof java.io.InputStream)) {
        input = new java.io.ByteArrayInputStream(input);
    }
    return getRhinoEngine().deserialize(input);
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
    return rhino.Context.getCurrentContext();
}

/**
 * Get the org.helma.javascript.RhinoEngine associated with this application.
 */
function getRhinoEngine() {
    return getRhinoContext().getThreadLocal("engine");
}

/**
 * Get the app's module search path as list of repositories.
 */
function getRepositories() {
    return new ScriptableList(getRhinoEngine().getRepositories());
}

/**
 * Add a repository to the module search path
 * @param repo a repository
 */
function addRepository(repo) {
    if (typeof repo == "string") {
        repo = new org.helma.repository.FileRepository(repo);
    }
    var path = getRepositories();
    if (repo.exists() && !path.contains(repo)) {
        path.add(Math.max(0, path.length) - 1, repo);
    }
}

Object.defineProperty(this, "args", {
    value: new ScriptableList(getRhinoEngine().getCommandLineArguments())
});
