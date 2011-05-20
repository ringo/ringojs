/**
 * @fileoverview <p>This module provides the RingoJS-specific global functions
 * import, include, and export, as well as require.loader for Narwhal
 * compatibility.</p>
 */

Object.defineProperty(this, "global", { value: this });

(function() {

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

    // console implementation

    var console = {}, timers = {};
    // lazy-load ringo/term
    var term, writer, getWriter = function() {
        if (!writer) {
            term = require("ringo/term");
            writer = new term.TermWriter(system.stderr);
        }
        return writer;
    }
    var {traceHelper, assertHelper} = org.ringojs.util.ScriptUtils;

    function format() {
        var msg = arguments[0] ? String(arguments[0]) : "";
        var pattern = /%[sdifo]/;
        for (var i = 1; i < arguments.length; i++) {
            msg = pattern.test(msg)
                    ? msg.replace(pattern, String(arguments[i]))
                    : msg + " " + arguments[i];
        }
        return msg;
    }

    Object.defineProperties(console, {
        log: {
            value: function() {
                var msg = format.apply(null, arguments);
                getWriter().writeln(msg);
            }
        },
        error: {
            value: traceHelper.bind(null, function() {
                var msg = format.apply(null, arguments);
                var location = format("(%s:%d)", this.sourceName(), this.lineNumber());
                var writer = getWriter();
                writer.writeln(term.ONRED, term.BOLD, "[error]" + term.RESET,
                               term.BOLD, msg, term.RESET, location);
            })
        },
        warn: {
            value: traceHelper.bind(null, function() {
                var msg = format.apply(null, arguments);
                var location = format("(%s:%d)", this.sourceName(), this.lineNumber());
                var writer = getWriter();
                writer.writeln(term.ONYELLOW, term.BOLD, "[warn]" + term.RESET,
                               term.BOLD, msg, term.RESET, location);
            })
        },
        info: {
            value: traceHelper.bind(null, function() {
                var msg = format.apply(null, arguments);
                var location = format("(%s:%d)", this.sourceName(), this.lineNumber());
                var writer = getWriter();
                writer.writeln("[info]", term.BOLD, msg, term.RESET, location);
            })
        },
        trace: {
            value: traceHelper.bind(null, function() {
                var msg = format.apply(null, arguments);
                var writer = getWriter();
                writer.writeln("Trace: " + msg);
                writer.write(this.scriptStackTrace);
            })
        },
        assert: {
            value: assertHelper
        },
        time: {
            value: function(name) {
                if (name && !timers[name]) {
                    timers[name] = Date.now();
                }
            }
        },
        timeEnd: {
            value: function(name) {
                var start = timers[name];
                if (start) {
                    var time = Date.now() - start;
                    getWriter().writeln(name + ": " + time + "ms");
                    delete timers[name];
                    return time;
                }
                return undefined;
            }
        },
        dir: {
            value: function(obj) {
                require("ringo/shell").printResult(obj, getWriter());
            }
        }
    });

    Object.defineProperty(this, "console", {
        get: function() {
            return console;
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

})(global);
