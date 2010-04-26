include('io');

function createProcess(args) {
    var command = Array.map(args, String);
    return java.lang.Runtime.getRuntime().exec(command);
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
    var status = process.waitFor();
    if (status != 0) {
        var error = new TextStream(new Stream(process.getErrorStream())).read();
        throw new Error("(" + status + ") " + error);
    }
    return new TextStream(new Stream(process.getInputStream())).read();
};

/**
 * executes a given command, attached to this process's
 * output and error streams, and returns the exit status.
 * @param {String} command and optional arguments as individual strings
 * @returns Number exit status
 */
exports.system = function() {
    var process = createProcess(arguments);
    try {
        return process.waitFor();
    } finally {
        new TextStream(new Stream(process.getInputStream())).copy(system.stdout);
        new TextStream(new Stream(process.getErrorStream())).copy(system.stderr);
    }
};
/**
 * executes a given command quietly and returns
 * the exit status.
 * @param {String} command and optional arguments as individual strings
 * @returns Number exit status
 */
exports.status = function() {
    var process = createProcess(arguments);
    return process.waitFor();
};


