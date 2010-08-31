/**
 * @fileOverview A module for spawning processes, connecting to their
 * input/output/errput and returning their response codes.
 */

var {Stream, MemoryStream, TextStream} = require('io');
var arrays = require('ringo/utils/arrays');

function createProcess(args) {
    // arguments may end with a {dir: "", env: {}} object
    var opts = (args.length > 1 && arrays.peek(args) instanceof Object) ?
            Array.pop(args) : {};
    // make command either a single string or an array of strings
    var command = args.length == 1 ? String(args[0]) : Array.map(args, String);
    var {dir, env} = opts;
    dir = dir ? new java.io.File(dir) : null;
    if (env && !Array.isArray(env)) {
        // convert env to an array of the form ["key=value", ...]
        env = [key + "=" + env[key] for (key in env)];
    } else if (!env) {
        env = null;
    }
    return java.lang.Runtime.getRuntime().exec(command, env, dir);
}

function connect(process, output, errput) {
    spawn(function() {
        new TextStream(new Stream(process.inputStream)).copy(output);
    }).get();
    spawn(function() {
        new TextStream(new Stream(process.errorStream)).copy(errput);
    }).get();
}

/**
 * executes a given command and returns the
 * standard output.  If the exit status is non-zero,
 * throws an Error.
 * @param {String} command... and optional arguments as individual strings
 * @param {Object} [options] options object. This may contain a `dir` string
 * property specifying the directory to run the process in and a `env`
 * object property specifying additional environment variable mappings.
 * @returns String the standard output of the command
 */
exports.command = function() {
    var process = createProcess(arguments);
    var output = new TextStream(new MemoryStream());
    var error = new TextStream(new MemoryStream());
    connect(process, output, error);
    var status = process.waitFor();
    if (status != 0) {
        throw new Error("(" + status + ") " + error.content);
    }
    return output.content;
};

/**
 * executes a given command, attached to this process's
 * output and error streams, and returns the exit status.
 * @param {String} command... and optional arguments as individual strings
 * @param {Object} [options] options object. This may contain a `dir` string
 * property specifying the directory to run the process in and a `env`
 * object property specifying additional environment variable mappings.
 * @returns Number exit status
 */
exports.system = function() {
    var process = createProcess(arguments);
    connect(process, system.stdout, system.stderr);
    return process.waitFor();
};

/**
 * executes a given command quietly and returns
 * the exit status.
 * @param {String} command... and optional arguments as individual strings
 * @param {Object} [options] options object. This may contain a `dir` string
 * property specifying the directory to run the process in and a `env`
 * object property specifying additional environment variable mappings.
 * @returns Number exit status
 */
exports.status = function() {
    var process = createProcess(arguments);
    connect(process, dummyStream(), dummyStream());
    return process.waitFor();
};

function dummyStream() {
    return {
        writable: function() true,
        readable: function() false,
        seekable: function() false,
        write: function() this,
        flush: function() this,
        close: function() this        
    }
}


