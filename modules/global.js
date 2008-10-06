/**
 * Helma NG global functions
 */

const global = this;

(function() {

    /**
     * Load a module and return its module scope.
     * @param moduleName the module name such as 'core.object'
     * @return {Object} the module scope
     */
    this.loadModule = function(moduleName) {
        return getRhinoEngine().loadModule(getRhinoContext(), moduleName, this);
    };

    /**
     * Load a module and include all its properties in the calling scope.
     * @param moduleName the module name such as 'core.object'
     */
    this.includeModule = function(moduleName) {
        var module = this.loadModule(moduleName);
        var exported = module.__export__;
        if (!exported) {
            throw ReferenceError("Property __export__ is not defined on module " + moduleName);
        } else if (!(exported instanceof Array)) {
            throw TypeError("Property __export__ is not an array in module " + moduleName);
        }
        for each (var key in exported) {
            this[key] = module[key];
        }
    };

    /**
     * Get a resource from the app's module search path.
     * @param resourceName
     */
    this.getResource = function(resourceName) {
        var engine = getRhinoEngine();
        return engine.findResource(resourceName, engine.getParentRepository(this));
    };

    /**
     * Add a java resource to our classpath if it isn't already contained.
     * @param resourcePath the resource path
     */
    this.addToClasspath = function(resourcePath) {
        var resource = this.getResource(resourcePath);
        getRhinoEngine().addToClasspath(resource);
    };

    /**
     * Get all resources with the given path prefix in the app's module search path
     * @param resourcePath
     * @param nested
     */
    this.getResources = function(resourcePath, nested) {
        var engine = getRhinoEngine();
        return new ScriptableList(engine.getResources(resourcePath, !!nested));
    };

    /**
     * Parse a skin resource and pass its tokens to the supplied function.
     * @param resourceOrString a skin resource or string
     * @param fn a function to consume the skin tokens
     */
    this.parseSkin = function(resourceOrString, fn) {
        var engine = getRhinoEngine();
        var parser = new org.helma.template.SkinParser({
            renderText: function(text) {
                fn(text);
            },
            renderMacro: function(macro) {
                fn(engine.wrapArgument(macro, {}));
            }
        });
        parser.parse(resourceOrString);
    };

    /**
     * Get the org.mozilla.javascript.Context associated with the current thread.
     */
    var getRhinoContext = function getRhinoContext() {
        var Context = org.mozilla.javascript.Context;
        return Context.getCurrentContext();
    }

    /**
     * Get the org.helma.javascript.RhinoEngine associated with this application.
     */
    var getRhinoEngine = function getRhinoEngine() {
        return getRhinoContext().getThreadLocal("engine");
    };

})(global);
