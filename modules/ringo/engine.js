/**
 * @fileOverview Provides access to the Rhino JavaScript engine.
 */

const {Context, ClassShutter} = org.mozilla.javascript;
const {RhinoEngine, RingoConfig} = org.ringojs.engine;
const engine = RhinoEngine.getEngine(global);

/**
 * An object reflecting the Java system properties.
 */
exports.properties = (() => {
    try {
        return new ScriptableMap(java.lang.System.getProperties());
    } catch (error) {
        return {};
    }
})();

/**
 * The RingoJS version as an array-like object with the major and minor version
 * number as first and second element.
 */
exports.version = new ScriptableList(RhinoEngine.VERSION);

/**
 * Define a class as Rhino host object.
 * @param {JavaClass} javaClass the class to define as host object
 */
exports.addHostObject = (javaClass) => {
    engine.defineHostClass(javaClass);
};

/**
 * Register a callback to be invoked when the current RingoJS instance is
 * terminated.
 * @param {Function|Object} funcOrObject Either a JavaScript function or a
 * JavaScript object containing properties called `module` and `name`
 * specifying a function exported by a RingoJS module.
 * @param {Boolean} sync (optional) whether to invoke the callback
 * synchronously (on the main shutdown thread) or asynchronously (on the
 * worker's event loop thread)
 */
exports.addShutdownHook = (funcOrObject, sync) => {
    engine.addShutdownHook(funcOrObject, Boolean(sync));
};

/**
 * Create a sandboxed scripting engine with the same install directory as this and the
 * given module paths, global properties, class shutter and sealing
 * @param {Array} modulePath the comma separated module search path
 * @param {Object} globals a map of predefined global properties (may be undefined)
 * @param {Object} options an options object (may be undefined). The following options are supported:
 *  - systemModules array of system module directories to add to the module search path
 *                  (may be relative to the ringo install dir)
 *  - classShutter a Rhino class shutter, may be null
 *  - sealed if the global object should be sealed, defaults to false
 * @returns {RhinoEngine} a sandboxed RhinoEngine instance
 * @throws {FileNotFoundException} if any part of the module paths does not exist
 */
exports.createSandbox = (modulePath, globals, options) => {
    options || (options = {});
    const systemModules = options.systemModules || null;
    const config = new RingoConfig(engine.getRingoHome(), modulePath, systemModules);
    if (options.classShutter) {
        const shutter = options.shutter;
        config.setClassShutter(shutter instanceof ClassShutter ?
                shutter : new ClassShutter(shutter));
    }
    config.setSealed(Boolean(options.sealed));
    return engine.createSandbox(config, globals);
};

/**
 * Get the RingoJS installation directory.
 * @returns {Repository} a Repository representing the Ringo installation directory
 */
exports.getRingoHome = () => engine.getRingoHome();

/**
 * Get a wrapper for an object that exposes it as Java object to JavaScript.
 * @param {Object} object an object
 * @returns {Object} the object wrapped as native java object
 */
exports.asJavaObject = (object) => engine.asJavaObject(object);

/**
 * Get a wrapper for a string that exposes the java.lang.String methods to JavaScript
 * This is useful for accessing strings as java.lang.String without the cost of
 * creating a new instance.
 * @param {Object} object an object
 * @returns {Object} the object converted to a string and wrapped as native java object
 */
exports.asJavaString = (object) => engine.asJavaString(object);

/**
 * Get the Rhino optimization level for the current thread and context.
 * The optimization level is an integer between -1 (interpreter mode)
 * and 9 (compiled mode, all optimizations enabled). The default level
 * is 0.
 * @returns {Number} level an integer between -1 and 9
 */
exports.getOptimizationLevel = () => engine.getOptimizationLevel();

/**
 * Set the Rhino optimization level for the current thread and context.
 * The optimization level is an integer between -1 (interpreter mode)
 * and 9 (compiled mode, all optimizations enabled). The default level
 * is 0.
 * @param {Number} level an integer between -1 and 9
 */
exports.setOptimizationLevel = (level) => {
    engine.setOptimizationLevel(level);
}

/**
 * Get the org.mozilla.javascript.Context associated with the current thread.
 */
exports.getRhinoContext = () => Context.getCurrentContext();

/**
 * Get the org.ringojs.engine.RhinoEngine associated with this application.
 * @returns {org.ringojs.engine.RhinoEngine} the current RhinoEngine instance
 */
exports.getRhinoEngine = () => engine;

/**
 * Get a new worker instance.
 * @return {org.ringojs.engine.RingoWorker} a new RingoWorker instance
 */
exports.getWorker = () => engine.getWorker();

/**
 * Get the worker instance associated with the current thread or the given scope or function object.
 * @param {Object} obj optional scope or function to get the worker from.
 * @return {org.ringojs.engine.RingoWorker} the current worker
 */
exports.getCurrentWorker = (obj) => engine.getCurrentWorker(obj || null);

/**
 * Get a list containing the syntax errors encountered in the current worker.
 * @returns {ScriptableList} a list containing the errors encountered in the
 * current worker
 */
exports.getErrors = () => new ScriptableList(engine.getCurrentWorker(null).getErrors());

/**
 * Get the app's module search path as list of repositories.
 * @returns {ScriptableList} a list containing the module search path repositories
 */
exports.getRepositories = () => new ScriptableList(engine.getRepositories());

/**
 * Add a repository to the module search path
 * @param {Repository} repo a repository
 */
exports.addRepository = (repo) => {
    if (typeof repo == "string") {
        repo = new org.ringojs.repository.FileRepository(repo);
    }
    const path = getRepositories();
    if (repo.exists() && !path.contains(repo)) {
        path.add(Math.max(0, path.length) - 1, repo);
    }
};
