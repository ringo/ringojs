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
        for (var [key, value] in module) {
            /* if (value && value.__parent__ && value.__parent__ != module) {
                // only copy values that were defined in the module
                // FIXME we really need explicit exports here!
                continue;
            } */
            this[key] = value;
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
        var {SkinParser, SkinRenderer} = org.helma.template;
        var engine = getRhinoEngine();
        var parser = new SkinParser(new SkinRenderer({
            renderText: function(text) {
                fn(text);
            },
            renderMacro: function(macro) {
                fn(engine.wrapArgument(macro, {}));
            }
        }));
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


    /*
     * Support for defining thread-local variables in the global scope.
     */
    var threadLocal = new JavaAdapter(java.lang.ThreadLocal, {
        initialValue: function() {
            return {};
        }
    });

    /**
     * Define a thread-local variable for the current thread/request
     * @param name the name of the thread-local variable
     * @param value the value of the thread-local variable
     */
    this.putThreadLocal = function(name, value) {
        getThreadScope()[name] = value;
    };

    /**
     * Get a thread-local variable, or the thread-local scope if called
     * without argument.
     * @param name the name of the thread-local variable, or undefined to
     *             retrieve the thread-local scope itself
     */
    this.getThreadLocal = function(name) {
        if (name == undefined) {
            return getThreadScope();
        } else {
            return getThreadScope()[name];
        }
    }

    const threadScopeKey = "threadScope";

    var getThreadScope = function() {
        var cx = getRhinoContext();
        var threadScope = cx.getThreadLocal(threadScopeKey);
        if (!threadScope) {
            threadScope = {};
            cx.putThreadLocal(threadScopeKey, threadScope);
        }
        return threadScope;
    };

    /*
     * Shortcut for accessing thread-local variables
     * as properties of the global scope
     */
    this.__get__ = function(name) {
        var threadScope = getThreadScope();
        if (name in threadScope) {
            return threadScope[name];
        } else {
            return this[name];
        }
    };

    this.__has__ = function(name) {
        return name in this || name in getThreadLocal();
    };

    /*
     * Do not enumerate any properties of the global scope, ever.
     */
    this.__getIds__ = function() {
        return [];
    };

})(global);
