/**
 * @fileoverview RingoJS adopts some of the global properties from the Rhino
 * shell and adds a few of its own.
 *
 * Note that this module must and can not be imported like an ordinary module.
 * It is evaluated only once upon RingoJS startup.
 */

/**
 * A reference to the global object itself.
 *
 * When a module is evaluated in RingoJS it uses its own private module scope
 * which in turn uses this shared global object as prototype. Therefore,
 * properties of the global object are visible in every module.
 *
 * Since the global object is hidden in the prototype chain of module scopes
 * it cannot normally be accessed directly. This reference allows you to do so,
 * defining real global variables if you want to do so.
 *
 * @name global
 */
Object.defineProperty(this, "global", { value: this });

/**
 * The `require` function as defined in the
 * [CommonJS Modules 1.1.1](http://wiki.commonjs.org/wiki/Modules/1.1.1)
 * specification.
 *
 * The RingoJS `require` function has the following properties:
 *
 *  - [extensions][#require.extensions]
 *  - [main][#require.main]
 *  - [paths][#require.paths]
 *
 * @param {String} moduleId the id or path of the module to load
 * @return {Object} the exports object of the required module
 * @name require
 * @function
 */

/**
 *  An object used to extend the way [require][#require] loads modules.
 *
 *  Use a file extension as key and a function as value. The function should
 *  accept a `Resource` object as argument and return either a string to be
 *  used as JavaScript module source or an object which will be directly
 *  returned by `require`.
 *
 *  For example, the following one-liner will enable `require()` to load XML
 *  files as E4X modules:
 *
 *     require.extensions['.xml'] = function(r) new XML(r.content);
 *
 * @name require.extensions
 */

/**
 *  If RingoJS was started with a command line script, `require.main` contains
 *  the `module` object of the main module. Otherwise, this property is defined
 *  but has the value `undefined`.
 *
 * @name require.main
 */

/**
 *  An array that contains the module search path. You can add or
 *  remove paths items to or from this array in order to change the places
 *  where RingoJS will look for modules.
 * @name require.paths
 */

/**
 * The Module object as defined in the
 * [CommonJS Modules 1.1.1](http://wiki.commonjs.org/wiki/Modules/1.1.1)
 * specification.
 *
 * The RingoJS `module` object has the following properties:
 *
 *   - id
 *   - path
 *   - uri
 *   - [resolve][#module.resolve]
 *   - [singleton][#module.singleton]
 *
 * @name module
 * @property module
 */

/**
 * @param {String} path
 * @name module.resolve
 * @function
 */

/**
 * @param {String} id
 * @param {Function} factory
 * @name module.singleton
 * @function
 */

/**
 * @name exports
 */

(function() {

    /**
     * Load a module and include all its properties in the calling scope.
     * @param {String} moduleId  the id or path of the module to load
     * @name include
     * @function
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
     * Takes any number of top-level names to be exported from this module.
     *
     * This is a non-standard alternative to the [exports][#exports] object
     * for exporting values in a less verbose and intrusive way.
     *
     * @param name... one or more names of exported properties
     * @name export
     * @function
     */
    Object.defineProperty(this, "export", {
        value: function() {
            var module = this;
            var exports = this.exports;
            if (!exports || typeof exports != "object") {
                // this should never happen with ringo modules
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
     * The `system` module, preloaded for your convenience.
     * @name system
     * @see system
     */
    var system = this.system = this.system || require('system');

    /**
     * Firebug-like debug console, preloaded for your convenience.
     * @name console
     * @see console
     */
    Object.defineProperty(this, "console", {
        get: function() require("console"),
        enumerable: true
    });

    // Include file and line number in error.toString() - better error messages ftw!
    Object.defineProperty(Error.prototype, "toString", {
        value: function() {
            if (this.fileName && this.lineNumber != null) {
                return [
                    this.name, ": ",
                    this.message, " (",
                    this.fileName, "#",
                    this.lineNumber, ")"].join("");
            }
            return this.name + ": " + this.message;
        },
        writable: true, configurable: true
    });

})(global);
