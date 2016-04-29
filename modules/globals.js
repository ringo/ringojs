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
 * @example global.foo = "bar";
 */
Object.defineProperty(this, "global", { value: this });

(function() {

    /**
     * Load a module and include all its properties in the calling scope.
     * @param {String} moduleId  the id or path of the module to load
     * @name include
     * @function
     * @example include('fs');
     * // calls fs.isReadable()
     * if (isReadable('essay.txt') ) { ... }
     */
    Object.defineProperty(global, "include", {
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
     * This is a non-standard alternative to the [exports](#exports) object
     * for exporting values in a less verbose and intrusive way.
     *
     * @param {String...} name... one or more names of exported properties
     * @name export
     * @function
     * @example // equivalent to exports.foo = function() { ... }
     * // and exports.bar = function() { ... }
     * export(
     *   "foo",
     *   "bar"
     * );
     *
     * function foo() { ... };
     * function bar() { ... };
     */
    Object.defineProperty(global, "export", {
        value: function() {
            var module = this;
            var exports = this.exports;
            if (!exports || typeof exports != "object") {
                // this should never happen with ringo modules
                exports = {};
                Object.defineProperty(module, "exports", { value: exports });
            }
            Array.prototype.forEach.call(arguments, function(name) {
                Object.defineProperty(exports, name, {
                    get: function() {
                        return module[name];
                    },
                    enumerable: true
                });
            });
        }
    });

    var engine = require("ringo/engine");

    /**
     * Executes a function after specified delay. The function will be called
     * in the thread of the local event loop. This means it will only run after
     * the currently executing code and other code running before it have
     * terminated.
     * @param {Function} callback a function
     * @param {Number} delay the delay in milliseconds
     * @param {*...} [args...] optional arguments to pass to the function
     * @returns {Object} an id object useful for cancelling the scheduled invocation
     * @name setTimeout
     * @see #clearTimeout()
     */
    this.setTimeout = function(callback, delay) {
        var args = Array.prototype.slice.call(arguments, 2);
        delay = parseInt(delay, 10) || 0;
        var worker = engine.getCurrentWorker(callback);
        return worker.schedule(delay, this, callback, args);
    };

    /**
     * Cancel a timeout previously scheduled with [setTimeout()](#setTimeout).
     * @param {Object} id the id object returned by setTimeout()
     * @name clearTimeout
     * @see #setTimeout
     */
    Object.defineProperty(global, "clearTimeout", {
        value: function(id) {
            try {
                var worker = engine.getCurrentWorker();
                worker.cancel(id);
            } catch (error) {
                // ignore
            }
        }
    });

    /**
     * Calls a function repeatedly, with a fixed time delay between each call to
     * that function. The function will be called in the thread of the local event
     * loop. This means it will only run after the currently executing code and
     * other code running before it have terminated.
     * @param {Function} callback a function
     * @param {Number} delay the delay in milliseconds
     * @param {*...} args... optional arguments to pass to the function
     * @returns {Object} an id object useful for cancelling the scheduled invocation
     * @name setInterval
     * @see #clearInterval()
     */
    global.setInterval =  function(callback, delay) {
        var args = Array.prototype.slice.call(arguments, 2);
        delay = Math.max(parseInt(delay, 10) || 0, 1);
        var worker = engine.getCurrentWorker(callback);
        return worker.scheduleInterval(delay, this, callback, args);
    };

    /**
     * Cancel a timeout previously scheduled with [setInterval()](#setInterval).
     * @param {Object} id the id object returned by setInterval()
     * @name clearInterval
     * @see #setInterval
     */
    Object.defineProperty(global, "clearInterval", {
        value:  function(id) {
            try {
                var worker = engine.getCurrentWorker();
                worker.cancel(id);
            } catch (error) {
                // ignore
            }
        }
    });


    /**
     * Debug console to print messages on `stderr`. It’s similar to the console
     * object implemented in most web browsers.
     * @name console
     * @see console
     * @example console.log('Hello World!');
     */
    Object.defineProperty(global, "console", {
        get: function() require("console")
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

})();

/**
 * The `require` function as defined in the
 * [CommonJS Modules 1.1.1](http://wiki.commonjs.org/wiki/Modules/1.1.1)
 * specification.
 *
 * `moduleId` is resolved following these rules:
 *
 *  - If `moduleId` starts with `'./'` or '`../`' it is resolved relative to the
 *  current module.
 *  - If `moduleId` is relative (starting with a file or directory name),
 *  it is resolve relative to the module search path.
 *  - If `path` is absolute (e.g. starting with `'/'`) it is interpreted as
 *  absolute file name.
 *
 * The RingoJS `require` function has the following properties:
 *
 *  - [extensions](#require.extensions)
 *  - [main](#require.main)
 *  - [paths](#require.paths)
 *
 * @param {String} moduleId the id or path of the module to load
 * @return {Object} the exports object of the required module
 * @name require
 * @function
 */

/**
 *  An object used to extend the way [require](#require) loads modules.
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
 * @example // is the current module is the main module?
 *  if (require.main === module) {
 *   // Start up actions like in a Java public static void main() method
 *   var server = new Server();
 *   server.start();
 * }
 */

/**
 *  An array that contains the module search path. You can add or
 *  remove paths items to or from this array in order to change the places
 *  where RingoJS will look for modules.
 * @name require.paths
 */

/**
 * The `module` object as defined in the
 * [CommonJS Modules 1.1.1](http://wiki.commonjs.org/wiki/Modules/1.1.1)
 * specification.
 *
 * The RingoJS `module` object has the following properties:
 *
 *   - [directory](#module.directory)
 *   - [exports](#module.exports)
 *   - [id](#module.id)
 *   - [path](#module.path)
 *   - [uri](#module.uri)
 *   - [resolve](#module.resolve)
 *   - [singleton](#module.singleton)
 *
 * @name module
 * @property module
 */

/**
 * The directory that contains this module.
 * @name module.directory
 */

/**
 * By default, `module.exports` refers to [exports](#exports) object. Setting
 * this property to a different value will cause that value to be used as
 * `exports` object instead.
 * @name module.exports
 */

/**
 * The module id of this module.
 * @name module.id
 * @example // We are inside the foo.js module
 * // prints /usr/local/ringo-app/lib/foo
 * console.log(module.id);
 */

/**
 * The absolute path of this module's source.
 * @name module.path
 */

/**
 * This module's URI.
 * @name module.uri
 * @example // We are inside the foo.js module
 * // prints: /usr/local/ringo-app/lib/foo.js
 * console.log(module.uri);
 */

/**
 * Resolve `path` relative to this module, like when calling [require](#require)
 * with a `moduleId` starting with `'./'` or '`../`'.
 *
 * This returns an absolute path if the current module is a regular file.
 * For other types of modules such as those residing in a .jar file it returns
 * a relative path relative to the module's module path root.
 *
 * @param {String} path
 * @return {String} the resolved path
 * @name module.resolve
 * @function
 */

/**
 * `module.singleton` enables the creation of singletons across all workers
 * using the same module. This means that a value within a module will be
 * instantiated at most once for all concurrent worker threads even though
 * workers usually operate on their own private scopes and variables.
 *
 * The `id` argument identifies the singleton within the module. When
 * `module.singleton` is called with an `id` that has not been initialized yet
 * and the `factory` argument is defined, `factory` is invoked and its return
 * value is henceforth used as singleton value for the given `id`.
 *
 * Once the value of a singleton has been set, the `factory` function
 * is never called again and all calls to `module.singleton` with
 * that id return that original value.
 *
 * `module.singleton` supports lazy initialization. A singleton can remain
 * undefined if `module.singleton` is called without `factory` argument.
 * In this case `module.singleton` returns `undefined` until it is first called
 * with a `factory` argument.
 *
 * @example // db-controller.js
 * // Create a single cache for all workers
 * var entityCache = module.singleton("entityCache", function() {
 *   return new SomeFancyCache(1000);
 * });
 *
 * // All instances of "db-controller" in different workers
 * // will use the same cache because it's a singleton
 * entityCache.put("somekey", { ... });
 * entityCache.get("somekey");
 *
 * @param {String} id the singleton id
 * @param {Function} factory (optional) factory function for the singleton
 * @return the singleton value
 * @name module.singleton
 * @function
 */

/**
 * The `exports` object as defined in the
 * [CommonJS Modules 1.1.1](http://wiki.commonjs.org/wiki/Modules/1.1.1)
 * specification.
 *
 * Define properties on the `exports` object to make them available to other
 * modules [requiring](#require) this module.
 * @name exports
 * @example exports.multiply = function(x, y) { return x * y; }
 */

/**
 * The `arguments` array contains the command line arguments RingoJS was
 * started with.
 *
 * Note that this variable is shadowed by the `arguments` object inside
 * functions which is why it is usually safer to use [system.args](../system#args)
 * instead.
 * @name arguments
 */

/**
 * The `environment` object contains the Java system properties.
 * @name environment
 * @see <a href="http://docs.oracle.com/javase/tutorial/essential/environment/sysprop.html">Java System Properties</a>
 */

/**
 * Runs the garbage collector.
 * @name gc
 * @function
 * @see <a href="http://docs.oracle.com/javase/8/docs/api/java/lang/Runtime.html#gc()">java.lang.Runtime.gc()</a>
 */

/**
 * Load JavaScript source files named by string arguments and execute them. If multiple
 * arguments are given, each file is read in and executed in turn.
 * @param {String...} filename... one or more file names
 * @name load
 * @function
 */

/**
 * Converts each argument to a string and prints it.
 * @param {*...} args... one ore more arguments
 * @name print
 * @function
 */

/**
 * Quit the RingoJS shell. The shell will also quit in interactive mode if an
 * end-of-file character (CTRL-D) is typed at the prompt.
 * @name quit
 * @function
 */

/**
 * Seal the specified object so any attempt to add, delete or modify its
 * properties would throw an exception.
 * @param {Object} obj a JavaScript object
 * @name seal
 * @function
 */

/**
 * Returns a wrapper around a function that synchronizes on the original
 * function or, if provided, on the second argument.
 *
 * When multiple threads call functions that are synchronized on the same object,
 * only one function call is allowed to execute at a time.
 *
 * @param {Function} func a function
 * @param {Object} [obj] optional object to synchronize on
 * @return {Function} a synchronized wrapper around the function
 * @name sync
 * @function
 * @example exports.synchronizedFunction = sync(function() {
 *   // no two threads can execute this code in parallel
 * });
 */

/**
 * Loads a custom Java-based host object into the global scope. This is useful to provide
 * transparent access to Java classes inside the JavaScript environment. It uses
 * `ScriptableObject.defineClass()` to define the extension.
 * @param {java.lang.Class} clazz the host object's Java class
 * @name defineClass
 * @function
 * @example // org.somejavalib.Foo extends org.mozilla.javascript.ScriptableObject
 * defineClass(org.somejavalib.Foo);
 * var x = new Foo();
 * @see <a href="http://es5.github.io/#x4.3.8">ECMAScript 5 host object definition</a>
 * @see <a href="http://www-archive.mozilla.org/rhino/apidocs/org/mozilla/javascript/ScriptableObject.html#defineClass%28org.mozilla.javascript.Scriptable,%20java.lang.Class%29">
 *     Rhino's ScriptableObject.defineClass()</a>
 * @see The Java package <code>org.ringojs.wrappers</code> includes typical host objects like <code>Binary</code>,
 *     <code>EventAdapter</code> and <code>Stream</code>.
 */

/**
 * Resolve `path` following the same logic [require](#require) uses for
 * module ids and return an instance of `org.ringojs.repository.Resource`
 * representing the resolved path. It represents an abstract container
 * for exactly one resources. For file I/O use the [fs](../fs/) module, which
 * provides fine-grained functions for file and stream manipulation.
 *
 * @example // Current working directory: /usr/local/httpd/htdocs/
 * > var resource = getResource("./someFile.xml");
 * >
 * > resource.getChecksum();
 * 1419793411000
 * >
 * > resource.getUrl();
 * [java.net.URL file:/usr/local/httpd/htdocs/someFile.xml]
 * >
 * > // read the content
 * > resource.getContent();
 * '&lt;?xml version="1.0" encoding="UTF-8"?> ...
 *
 * @param {String} path the resource path
 * @name getResource
 * @return {org.ringojs.repository.Resource} a resource
 * @see #getRepository
 * @function
 */

/**
 * Resolve `path` following the same logic [require](#require) uses for
 * module ids and return an instance of `org.ringojs.repository.Repository`
 * representing the resolved path. A repository provides a unified loading of scripts
 * and other application resources. It represents an abstract container of resources.
 * For file I/O use the [fs](../fs/) module, which provides fine-grained functions
 * for file and stream manipulation.
 *
 * @example > var fileRepository = getRepository("/usr/local/httpd/htdocs/");
 * > var resource = fileRepository.getResource("someFile.xml");
 * > resource.getUrl();
 * [java.net.URL file:/usr/local/httpd/htdocs/someFile.xml]
 *
 * @param {String} path the repository path
 * @return {org.ringojs.repository.Repository} a repository
 * @name getRepository
 * @see #getResource
 * @function
 */

/**
 * Adds `path` to the RingoJS application classpath at runtime. This is necessary if
 * libraries and their classes are not in the default Java classpath.
 *
 * Calling `addToClasspath()` will invoke an `org.ringojs.engine.AppClassLoader`,
 * which is a subclass of `java.net.URLClassLoader`. It checks if the URL has been
 * already loaded and if not, adds it to the resource search path. If the given URL ends
 * with `/`, it will be treated as directory, otherwise it's assumed to refer to a jar file.
 * The function throws an exception if it could not load a path or if it fails.
 *
 * @param {String|Resource|Repository} path a directory or jar path; or a single resource; or a repository
 * @name addToClasspath
 * @function
 * @example // Adds Apache Lucene text search engine to the classpath
 * addToClasspath("../jars/lucene-core.jar");
 * @see <a href="http://ringojs.org/documentation/java_integration">Ringo Java Integration</a>
 */

/**
 * Calls `func` with the privileges of the current code base instead of the
 * privileges of the code in the call stack.
 *
 * This is useful when running with Java security manager enabled using the
 * `-P` or `--policy` command line switches.
 * @param {Function} func a function
 * @return {Object} the return value of the function
 * @name privileged
 * @function
 */

/**
 * Calls `func` in a new thread from an internal thread pool and returns
 * immediately.
 * @param {Function} func a function
 * @name spawn
 * @function
 */

