/**
 * Helma NG global functions
 */

Object.defineProperty(this, "global", { value: this });

(function() {

    var out = java.lang.System.out;
    const engine = org.mozilla.javascript.Context
            .getCurrentContext().getThreadLocal("engine");

    /**
     * Load a module and return its module scope.
     * @param {String} moduleName the module name
     * @return {Object} the module scope
     */
    Object.defineProperty(this, "require", {
        value: function(moduleName) {
            var module = engine.loadModule(moduleName, this);
            var exports = module.exports;
            if (!exports || typeof exports != "object") {
                // should never happen with helma modules
                exports = {};
                Object.defineProperty(module, "exports", { value: exports });
            }
            return exports; 
        }
    });

    Object.defineProperty(this.require, "main", {
        value: engine.getMainModule()
    })

    Object.defineProperty(this, "arguments", {
        value: new ScriptableList(engine.getArguments())
    });

    /**
     * Import a module and set the module scope in the calling scope, using the
     * module's name as property name or path.
     * @param {String} moduleName the module name
     * @param {String} propertyName optional property name to use for setting the
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
     * @param {String} moduleName the module name such as 'core.object'
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
            var module = this;
            var exports = this.exports;
            if (!exports || typeof exports != "object") {
                // this should never happen with helma modules
                exports = {};
                Object.defineProperty(module, "exports", { value: exports });
            }
            Array.forEach(arguments, function(name) {
                Object.defineProperty(exports, name, {
                    get: function() {
                        return module[name];
                    },
                    enumerable: true
                });
            });
        }
    });

    /**
     * Get a resource from the app's module search path.
     * @param resourceName
     */
    Object.defineProperty(this, "getResource", {
        value: function(resourceName) {
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
            engine.addToClasspath(resource);
        }
    });

    /**
     * Get all resources with the given path prefix in the app's module search path
     * @param resourcePath
     * @param nested
     */
    Object.defineProperty(this, "getResources", {
        value: function(resourcePath, nested) {
            return new ScriptableList(engine.findResources(resourcePath, Boolean(nested)));
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

})(global);
