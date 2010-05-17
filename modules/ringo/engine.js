/**
 * A module to access and manipulate the rhino engine running this application
 */

require('core/object');

export( 'properties',
        'addHostObject',
        'addRepository',
        'asJavaString',
        'asJavaObject',
        'createSandbox',
        'evaluate',
        'getErrors',
        'getRingoHome',
        'getRepositories',
        'getRhinoContext',
        'getRhinoEngine',
        'getOptimizationLevel',
        'setOptimizationLevel',
        'serialize',
        'deserialize',
        'version');

var rhino = org.mozilla.javascript;

/**
 * An object reflecting the Java system properties.
 */
var properties = new ScriptableMap(java.lang.System.getProperties());

/**
 * The RingoJS version as [major, minor] array.
 */
var version =new ScriptableList(org.ringojs.engine.RhinoEngine.VERSION);

/**
 * Define a class as Rhino host object.
 * @param {JavaClass} javaClass the class to define as host object
 */
function addHostObject(javaClass) {
    getRhinoEngine().defineHostClass(javaClass);
}

/**
 * Create a sandboxed scripting engine with the same install directory as this and the
 * given module paths, global properties, class shutter and sealing
 * @param {Array} modulePath the comma separated module search path
 * @param {Object} globals a map of predefined global properties (may be undefined)
 * @param {Object} options an options object (may be undefined). The following options are supported:
 *  - includeSystemModules whether to include the system modules in the module search path
 *  - classShutter a Rhino class shutter, may be null
 *  - sealed if the global object should be sealed, defaults to false
 * @returns {RhinoEngine} a sandboxed RhinoEngine instance
 * @throws {FileNotFoundException} if any part of the module paths does not exist
 */
function createSandbox(modulePath, globals, options) {
    options = options || {};
    var shutter = options.classShutter;
    if (shutter) {
        if (!(shutter instanceof rhino.ClassShutter)) {
            shutter = new rhino.ClassShutter(shutter);
        }
    } else {
        shutter = null;
    }
    var systemModules = Boolean(options.includeSystemModules);
    var sealed = Boolean(options.sealed);
    return getRhinoEngine().createSandbox(modulePath, globals, systemModules, shutter, sealed);
}

/**
 * Get the RingoJS installation directory.
 * @returns {Repository} a Repository representing the Ringo installation directory
 */
function getRingoHome() {
    return getRhinoEngine().getRingoHome();
}

/**
 * Get a wrapper for an object that exposes it as Java object to JavaScript.
 * @param {Object} object an object
 * @returns {Object} the object wrapped as native java object
 */
function asJavaObject(object) {
    return getRhinoEngine().asJavaObject(object);
}

/**
 * Get a wrapper for a string that exposes the java.lang.String methods to JavaScript
 * This is useful for accessing strings as java.lang.String without the cost of
 * creating a new instance.
 * @param {Object} object an object
 * @returns {Object} the object converted to a string and wrapped as native java object
 */
function asJavaString(object) {
    return getRhinoEngine().asJavaString(object);
}

/**
 * Get the Rhino optimization level for the current thread and context.
 * The optimization level is an integer between -1 (interpreter mode)
 * and 9 (compiled mode, all optimizations enabled). The default level
 * is 0.
 * @returns {Number} level an integer between -1 and 9
 */
function getOptimizationLevel() {
    return getRhinoEngine().getOptimizationLevel();
}

/**
 * Set the Rhino optimization level for the current thread and context.
 * The optimization level is an integer between -1 (interpreter mode)
 * and 9 (compiled mode, all optimizations enabled). The default level
 * is 0.
 * @param {Number} level an integer between -1 and 9
 */
function setOptimizationLevel(level) {
    getRhinoEngine().setOptimizationLevel(level);
}

/**
 * Serialize a JavaScript object graph to a java.io.OutputStream. If the
 * function is called without second argument the serialized object is
 * returned as byte array.
 * @param {Object} object the object to serialize
 * @param {java.io.OutputStream} output a java.io.OutputStream
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
 * @param {java.io.InputStream} input a InputStream or byte array containing a serialized object
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
 * @param {String} moduleName the name of the module to evaluate
 * @param {Object} scope the JavaScript object to evaluate the script on
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
 * Get the org.ringojs.engine.RhinoEngine associated with this application.
 * @returns {org.ringojs.engine.RhinoEngine} the current RhinoEngine instance
 */
function getRhinoEngine() {
    return org.ringojs.engine.RhinoEngine.getEngine();
}

/**
 * Get a list containing the syntax errors encountered in the current context.
 * @returns {ScriptableList} a list containing the errors encountered in the current context
 */
function getErrors() {
    return new ScriptableList(org.ringojs.engine.RhinoEngine.errors.get());
}

/**
 * Get the app's module search path as list of repositories.
 * @returns {ScriptableList} a list containing the module search path repositories
 */
function getRepositories() {
    return new ScriptableList(getRhinoEngine().getRepositories());
}

/**
 * Add a repository to the module search path
 * @param {Repository} repo a repository
 */
function addRepository(repo) {
    if (typeof repo == "string") {
        repo = new org.ringojs.repository.FileRepository(repo);
    }
    var path = getRepositories();
    if (repo.exists() && !path.contains(repo)) {
        path.add(Math.max(0, path.length) - 1, repo);
    }
}

