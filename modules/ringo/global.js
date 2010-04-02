/**
 * @fileoverview <p>This module provides the RingoJS-specific global functions
 * import, include, and export, as well as require.loader for Narwhal
 * compatibility.</p>
 */

Object.defineProperty(this, "global", { value: this });

(function() {

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

    var system = this.system = this.system || require('system');

    /**
     * Basic print function compatible with other JavaScript implementations.
     */
    if (!this.print) {
        Object.defineProperty(this, "print", {
            value: system.print
        });
    }

    // Load packages
    var packages = require("packages");
    packages.load();

    // Narwhal compatibility
    Object.defineProperty(require, "loader", {
        value: {
            usingCatalog: true,
            isLoaded: function() {
                return false;
            },
            resolve: function(id, baseId) {
                return id;
            }
        }
    });

    // Include file and line number in error.toString() - better error messages ftw!
    Error.prototype.toString = function() {
        if (this.fileName && this.lineNumber != null) {
            return [
                this.name, ": ",
                this.message, " (",
                this.fileName, "#",
                this.lineNumber, ")"].join("");
        }
        return this.name + ": " + this.message;
    };

    // whatever
    require('core/regexp');

})(global);
