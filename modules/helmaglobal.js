/**
 * Helma NG global functions
 */

Object.defineProperty(this, "global", { value: this });

(function() {

    /**
     * Load a module and return its module scope.
     * @param moduleName the module name
     * @return {Object} the module scope
     */
    Object.defineProperty(this, "require", {
        value: function(moduleName) {
            var module = getRhinoEngine().loadModule(getRhinoContext(), moduleName, this);
            var exports = module.exports;
            if (!exports || typeof exports != "object") {
                exports = {};
                Object.defineProperty(module, "exports", { value: exports });
            }
            return exports; 
        }
    });

    /**
     * Import a module and set the module scope in the calling scope, using the
     * module's name as property name or path.
     * @param moduleName the module name
     * @param propertyName optional property name to use for setting the
     *        module in the calling scope
     */
    Object.defineProperty(this, "import", {
        value: function(moduleName, propertyName) {
            var module = this.require(moduleName);
            propertyName = propertyName || moduleName;
            var path = propertyName.split("/");
            var elem = this;
            for (var i = 0; i < path.length - 1; i++) {
                var child = elem[path[i]];
                if (!child) {
                    child = elem[path[i]] = {};
                }
                elem = child;
            }
            elem[path[path.length - 1]] = module;
        }
    });

    /**
     * Load a module and include all its properties in the calling scope.
     * @param moduleName the module name such as 'core.object'
     */
    Object.defineProperty(this, "include", {
        value: function(moduleName) {
            var module = this.require(moduleName);
            for (var key in module) {
                this[key] = module[key];
            }
        }
    });

    /**
     * Define the properties to be exported.
     * @param name one or more names of exported properties
     */
    Object.defineProperty(this, "export", {
        value: function() {
            var list = this.__exports__ || [];
            for (var i = 0; i < arguments.length; i++) {
                list.push(arguments[i]);
            }
            if (this.__exports__ != list) {
                Object.defineProperty(this, "__exports__", { value: list });
            }
        }
    });

    /**
     * Get a resource from the app's module search path.
     * @param resourceName
     */
    Object.defineProperty(this, "getResource", {
        value: function(resourceName) {
            var engine = getRhinoEngine();
            return engine.findResource(resourceName, engine.getParentRepository(this));
        }
    });

    /**
     * Add a java resource to our classpath if it isn't already contained.
     * @param resourcePath the resource path
     */
    Object.defineProperty(this, "addToClasspath", {
        value: function(resourcePath) {
            var resource = this.getResource(resourcePath);
            getRhinoEngine().addToClasspath(resource);
        }
    });

    /**
     * Get all resources with the given path prefix in the app's module search path
     * @param resourcePath
     * @param nested
     */
    Object.defineProperty(this, "getResources", {
        value: function(resourcePath, nested) {
            var engine = getRhinoEngine();
            return new ScriptableList(engine.getResources(resourcePath, !!nested));
        }
    });

    /**
     * Parse a skin resource and pass its tokens to the supplied function.
     * @param resourceOrString a skin resource or string
     * @param fn a function to consume the skin tokens
     */
    Object.defineProperty(this, "parseSkin", {
        value: function(resourceOrString, fn) {
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
        }
    });

    /**
     * Basic print function compatible with other JavaScript implementations.
     */
    Object.defineProperty(this, "print", {
        value: function() {
            for (var i = 0; i < arguments.length; i++) {
                out.print(String(arguments[i]));
                if (i < arguments.length) {
                    out.print(' ');
                }
            }
            out.println();
        }
    });

    var out = java.lang.System.out;

    /**
     * Get the org.mozilla.javascript.Context associated with the current thread.
     */
    var getRhinoContext = function getRhinoContext() {
        return org.mozilla.javascript.Context.getCurrentContext();
    };

    /**
     * Get the org.helma.javascript.RhinoEngine associated with this application.
     */
    var getRhinoEngine = function getRhinoEngine() {
        return getRhinoContext().getThreadLocal("engine");
    };

})(global);
