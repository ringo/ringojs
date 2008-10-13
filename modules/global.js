/**
 * Helma NG global functions
 */

__defineProperty__("global", this, true, true, true);

(function() {

    /**
     * Load a module and return its module scope.
     * @param moduleName the module name such as 'core.object'
     * @return {Object} the module scope
     */
    this.__defineProperty__("require", function(moduleName) {
        return getRhinoEngine().loadModule(getRhinoContext(), moduleName, this);
    }, true, true, true);

    /**
     * Load a module and include all its properties in the calling scope.
     * @param moduleName the module name such as 'core.object'
     */
    this.__defineProperty__("include", function(moduleName) {
        var module = this.require(moduleName);
        var exported = module.__export__;
        if (!exported) {
            throw ReferenceError("Property __export__ is not defined on module " + moduleName);
        } else if (!(exported instanceof Array)) {
            throw TypeError("Property __export__ is not an array in module " + moduleName);
        }
        for each (var key in exported) {
            this[key] = module[key];
        }
    }, true, true, true);

    /**
     * Get a resource from the app's module search path.
     * @param resourceName
     */
    this.__defineProperty__("getResource", function(resourceName) {
        var engine = getRhinoEngine();
        return engine.findResource(resourceName, engine.getParentRepository(this));
    }, true, true, true);

    /**
     * Add a java resource to our classpath if it isn't already contained.
     * @param resourcePath the resource path
     */
    this.__defineProperty__("addToClasspath", function(resourcePath) {
        var resource = this.getResource(resourcePath);
        getRhinoEngine().addToClasspath(resource);
    }, true, true, true);

    /**
     * Get all resources with the given path prefix in the app's module search path
     * @param resourcePath
     * @param nested
     */
    this.__defineProperty__("getResources", function(resourcePath, nested) {
        var engine = getRhinoEngine();
        return new ScriptableList(engine.getResources(resourcePath, !!nested));
    }, true, true, true);

    /**
     * Parse a skin resource and pass its tokens to the supplied function.
     * @param resourceOrString a skin resource or string
     * @param fn a function to consume the skin tokens
     */
    this.__defineProperty__("parseSkin", function(resourceOrString, fn) {
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
    }, true, true, true);

    /**
     * Basic print function compatible with other JavaScript implementations.
     */
    this.__defineProperty__("print", function() {
        for (var i = 0; i < arguments.length; i++) {
            out.print(String(arguments[i]));
            if (i < arguments.length) {
                out.print(' ');
            }
        }
        out.println();
    }, true, true, true);

    var out = java.lang.System.out;

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
