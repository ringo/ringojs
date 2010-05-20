include('io');

function createProcess(args) {
    // make command either a single string or an array of strings
    var command = args.length == 1 ? String(args[0]) : Array.map(args, String);
    return java.lang.Runtime.getRuntime().exec(command);
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
 * @param {String} command and optional arguments as individual strings
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
 * @param {String} command and optional arguments as individual strings
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
 * @param {String} command and optional arguments as individual strings
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


