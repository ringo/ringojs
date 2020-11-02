/**
 * @fileOverview A module for spawning processes, connecting to their
 * input/output/errput and returning their response codes. It uses the
 * current JVM's runtime provided by
 * [java.lang.Runtime.getRuntime()](http://docs.oracle.com/javase/8/docs/api/java/lang/Runtime.html#getRuntime--).
 * The exact behavior of this module is highly system-dependent.
 */

const io = require('io');
const fs = require('fs');
const arrays = require('ringo/utils/arrays');
const system = require("system");

const parseArguments = function(args) {
    // arguments may end with a {dir: "", env: {}} object
    const opts = (args.length > 1 && arrays.peek(args) instanceof Object) ?
            Array.prototype.pop.call(args) : {};
    // make command either a single string or an array of strings
    opts.command = (args.length === 1) ? String(args[0]) : Array.prototype.map.call(args, String);
    return opts;
};

/**
 * Low-level function to spawn a new process. The function takes an object
 * argument containing the following properties where all properties except
 * command are optional:
 *
 *   * `command` a string or array of strings containing the command to execute.
 *     Which string lists represent a valid operating system command
 *     [is system-dependent](http://docs.oracle.com/javase/8/docs/api/java/lang/Runtime.html#exec-java.lang.String:A-java.lang.String:A-java.io.File-).
 *   * `dir` the directory to run the process in
 *   * `env` alternative environment variables. If null the process inherits the
 *     environment of the current process.
 *   * `binary` a boolean flag that uses raw binary streams instead of text streams
 *   * `encoding` the character encoding to use for text streams
 *
 * @param {Object} args an object containing the process command and options.
 * @returns {Process} a Process object
 * @see #Process
 */
const createProcess = exports.createProcess = function(args) {
    // convert arguments
    let {command, env, dir, binary, encoding} = args;
    dir = new java.io.File(dir || fs.workingDirectory());
    if (env && !Array.isArray(env)) {
        // convert env to an array of the form ["key=value", ...]
        Object.keys(env).map(key => key + "=" + env[key]);
    } else if (!env) {
        env = null;
    }
    const process = java.lang.Runtime.getRuntime().exec(command, env, dir);
    let stdin = new io.Stream(process.getOutputStream());
    let stdout = new io.Stream(process.getInputStream());
    let stderr = new io.Stream(process.getErrorStream());
    if (!binary) {
        stdin = new io.TextStream(stdin, {charset: encoding});
        stdout = new io.TextStream(stdout, {charset: encoding});
        stderr = new io.TextStream(stderr, {charset: encoding});
    }
    /**
     * The Process object can be used to control and obtain information about a
     * subprocess started using [createProcess()](#createProcess).
     * @name Process
     * @class Process
     * @see http://docs.oracle.com/javase/8/docs/api/java/lang/Process.html
     */
    return {
        /**
         * The process's input stream.
         * @name Process.prototype.stdin
         */
        stdin: stdin,
        /**
         * The process's output stream.
         * @name Process.prototype.stdout
         */
        stdout: stdout,
        /**
         * The process's error stream.
         * @name Process.prototype.stderr
         */
        stderr: stderr,
        /**
         * Wait for the process to terminate and return its exit status.
         * @name Process.prototype.wait
         * @function
         */
        wait: () => process.waitFor(),
        /**
         * Kills the subprocess.
         * @name Process.prototype.kill
         * @function
         */
        kill: () => process.destroy(),
        /**
         * Connects the process's steams to the argument streams and starts threads to
         * copy the data asynchronously.
         * @param {Stream} input output stream to connect to the process's input stream
         * @param {Stream} output input stream to connect to the process's output stream
         * @param {Stream} errput input stream to connect to the process's error stream
         * @name Process.prototype.connect
         */
        connect: (input, output, errput) => {
            if (input) {
                spawn(function() {
                    input.copy(stdin);
                }).get();
            }
            spawn(function() {
                stdout.copy(output);
            }).get();
            spawn(function() {
                stderr.copy(errput);
            }).get();
        }
    };
}

/**
 * Executes a given command and returns the standard output.
 * If the exit status is non-zero, throws an Error. Examples:
 *
 * <pre><code>var {command} = require("ringo/subprocess");<br>
 * // get PATH environment variable on Unix-like systems
 * var path = command("/bin/bash", "-c", "echo $PATH");<br>
 * // a simple ping
 * var result = command("ping", "-c 1", "ringojs.org");
 * </code></pre>
 *
 * @param {String} command command to call in the runtime environment
 * @param {String} [arguments...] optional arguments as single or multiple string parameters.
 *                 Each argument is analogous to a quoted argument on the command line.
 * @param {Object} [options] options object. This may contain a `dir` string
 * property specifying the directory to run the process in and a `env`
 * object property specifying additional environment variable mappings.
 * @returns {String} the standard output of the command
 */
exports.command = function() {
    const args = parseArguments(arguments);
    const process = createProcess(args);
    let output= new io.MemoryStream();
    let errput = new io.MemoryStream();
    if (!args.binary) {
        output = new io.TextStream(output, {charset: args.encoding});
        errput = new io.TextStream(errput, {charset: args.encoding});
    }
    process.connect(null, output, errput);
    const status = process.wait();
    if (status !== 0) {
        throw new Error("(" + status + ") " + errput.content);
    }
    return output.content;
};

/**
 * Executes a given command, attached to the JVM process's
 * output and error streams <code>System.stdout</code> and <code>System.stderr</code>,
 * and returns the exit status.
 * @param {String} command command to call in the runtime environment
 * @param {String} [arguments...] optional arguments as single or multiple string parameters.
 *                 Each argument is analogous to a quoted argument on the command line.
 * @param {Object} [options] options object. This may contain a `dir` string
 * property specifying the directory to run the process in and a `env`
 * object property specifying additional environment variable mappings.
 * @returns {Number} exit status
 */
exports.system = function() {
    const args = parseArguments(arguments);
    const process = createProcess(args);
    let output = system.stdout;
    let errput = system.stderr;
    if (args.binary) {
        output = output.raw;
        errput = errput.raw;
    }
    process.connect(null, output, errput);
    return process.wait();
};

/**
 * Executes a given command quietly and returns the exit status.
 * @param {String} command command to call in the runtime environment
 * @param {String} [arguments...] optional arguments as single or multiple string parameters.
 *                 Each argument is analogous to a quoted argument on the command line.
 * @param {Object} [options] options object. This may contain a `dir` string
 * property specifying the directory to run the process in and a `env`
 * object property specifying additional environment variable mappings.
 * @returns {Number} exit status
 * @name status
 */
exports.status = function() {
    const process = createProcess(parseArguments(arguments));
    process.connect(null, new DummyStream(), new DummyStream());
    return process.wait();
};

const DummyStream = function() {
    Object.defineProperties(this, {
        "writable": {"value": () => true},
        "readable": {"value": () => false},
        "seekable": {"value": () => false},
        "write": {"value": () => this},
        "flush": {"value": () => this},
        "close": {"value": () => this},
    });
    return this;
};
