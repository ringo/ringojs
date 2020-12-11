/**
 * @fileOverview A test runner compliant to the
 * [CommonJS Unit Testing](http://wiki.commonjs.org/wiki/Unit_Testing/1.0)
 * specification. It manages the execution of unit tests and processes test results.
 * The runner reports the total number of failures as exit status code.
 *
 * The runner treats a module like a test case. A test case defines the fixture
 * to run multiple tests. Test cases can provide optional <code>setUp()</code> and
 * <code>tearDown()</code> functions to initialize and destroy the fixture. The
 * test runner will run these methods prior to / after each test. Test functions
 * must start with a <code>test</code> prefix in their name, otherwise they
 * are skipped by the runner.
 *
 * The following example test case <code>testDatabase.js</code> starts a
 * new test runner if executed with <code>ringo testDatabase.js</code>
 *
 * @example // testDatabase.js
 * exports.setUp = function() { ... open db connection ... }
 * exports.tearDown = function() { ... close db connection ... }
 *
 * // Test functions start with the prefix 'test'
 * exports.testCreateTable = function() { ... }
 * exports.testInsertData = function() { ... }
 * exports.testTransactions = function() { ... }
 * exports.testDeleteTable = function() { ... }
 *
 * if (require.main === module) {
 *   // Get a runner and run on the current module
 *   require("test").run(exports);
 * }
 *
 * @see The <code><a href="../assert/index.html">assert</a></code> module is an
 * assertion library to write unit tests.
 */

const strings = require("ringo/utils/strings");
const term = require("ringo/term");
const fs = require("fs");

const {AssertionError, ArgumentsError} = require("./assert");

const {jsDump, getType, getStackTrace} = require("./ringo/utils/test");

exports.jsDump = jsDump;
exports.getStackTrace = getStackTrace;
exports.getType = getType;

/**
 * The main runner method. This method can be called with one, two or three
 * arguments: <code>run(scope)</code>, <code>run(scope, nameOfTest)</code>,
 * <code>run(scope, writer)</code> or <code>run(scope, nameOfTest, writer)</code>
 * @param {String|Object} scope Either the path to a module containing unit
 * tests to execute, or an object containing the exported test methods or nested scopes.
 * @param {String} name Optional name of a test method to execute
 * @param {Object} writer Optional writer to use for displaying the test results. Defaults
 * to TermWriter.
 */
const run = exports.run = function(scope, name, writer) {
    if (arguments.length === 2) {
        if (typeof(arguments[1]) === "object") {
            writer = name;
            name = undefined;
        } else {
            writer = new TermWriter();
        }
    } else if (arguments.length === 1) {
        writer = new TermWriter();
    }
    if (typeof(scope) === "string") {
        scope = require(fs.resolve(fs.workingDirectory(), scope));
    }
    const summary = {
        "testsRun": 0,
        "passed": 0,
        "errors": 0,
        "failures": 0,
        "time": 0
    };
    writer.writeHeader();
    if (name !== undefined) {
        executeTest(scope, name, summary, writer, []);
    } else {
        executeTestScope(scope, summary, writer, []);
    }
    scope = null;
    writer.writeSummary(summary);
    return summary.failures + summary.errors;
};

/**
 * Loops over all properties of a test scope and executes all methods whose
 * name starts with "test".
 * @param {Object} scope The scope object containing the test functions
 * @param {Object} summary An object containing summary information
 * @param {Object} writer A writer instance for displaying test results
 * @param {Array} path An array containing property path segments
 */
const executeTestScope = (scope, summary, writer, path) => {
    // loop over all exported properties and see if there are test methods to run
    Object.keys(scope).forEach(name => {
        if (name !== "test" && strings.startsWith(name, "test")) {
            executeTest(scope, name, summary, writer, path);
        }
    });
};

/**
 * Executes a single test, which can be either a single test method
 * or a test submodule.
 * @param {Object} scope The scope object containing the test
 * @param {String} name The name of the test to execute
 * @param {Object} summary An object containing summary information
 * @param {Object} writer A writer instance for displaying test results
 * @param {Array} path An array containing property path segments
 */
const executeTest = (scope, name, summary, writer, path) => {
    const value = scope[name];
    if (value instanceof Function) {
        writer.writeTestStart(name);
        let start = null;
        let time = 0;
        try {
            // execute setUp, if defined
            if (typeof(scope.setUp) === "function") {
                scope.setUp();
            }
            // execute test function
            start = Date.now();
            value();
            time = Date.now() - start;
            writer.writeTestPassed(time);
            summary.passed += 1;
        } catch (e) {
            if (!(e instanceof AssertionError) && !(e instanceof ArgumentsError)) {
                e = new EvaluationError(e);
            }
            writer.writeTestFailed(e);
            if (e instanceof AssertionError) {
                summary.failures += 1;
            } else {
                summary.errors += 1;
            }
        } finally {
            // execute tearDown, if defined
            if (typeof(scope.tearDown) === "function") {
                scope.tearDown();
            }
            summary.testsRun += 1;
            summary.time += time;
        }
    } else if (value.constructor === Object) {
        writer.enterScope(name);
        executeTestScope(value, summary, writer, path.concat([name]));
        writer.exitScope(name);
    }
};



/*******************************************
 *****  T E R M I N A L   W R I T E R  *****
 *******************************************/



/**
 * Constructs a new TermWriter instance
 * @class Instances of this class represent a writer for displaying test results
 * in the shell
 * @returns {TermWriter} A newly created TermWriter instance
 * @constructor
 */
const TermWriter = function() {
    this.indent = "";
    return this;
};

/** @ignore */
TermWriter.prototype.toString = function() {
    return "[TermWriter]";
};

/**
 * Write a header at the beginning of a unit test(suite)
 */
TermWriter.prototype.writeHeader = function() {
    term.writeln("================================================================================");
    return;
};

/**
 * Notification that we're entering a new test scope.
 * @param {String} name the name of the test scope
 */
TermWriter.prototype.enterScope = function(name) {
    term.writeln(this.indent, "+ Running", name, "...");
    this.indent += "  ";
};

/**
 * Notification that we're leaving a test scope.
 */
TermWriter.prototype.exitScope = function() {
    this.indent = this.indent.substring(2);
};

/**
 * Display the beginning of a test function execution
 * @param {String} name The name of the test function about to be executed
 */
TermWriter.prototype.writeTestStart = function(name) {
    term.write(this.indent, "+ Running", name, "...");
};

/**
 * Display a passed test method execution
 * @param {Number} time The time the execution of the test method took
 */
TermWriter.prototype.writeTestPassed = function(time) {
    term.writeln(term.BOLD, " PASSED", term.RESET, "(" + time + " ms)");
};

/**
 * Display a failed test
 * @param {Object} exception The exception thrown during test method execution
 */
TermWriter.prototype.writeTestFailed = function(exception) {
    term.writeln(term.BOLD, term.WHITE, term.ONRED, " FAILED ");
    exception.message.split(/\n/).forEach(function(line) {
        term.writeln("  ", term.BOLD, term.RED, line);
    });
    if (exception.stackTrace != null) {
        exception.stackTrace.forEach(function(line) {
            term.writeln("  ", term.BOLD, line);
        });
    } else if (exception.fileName) {
        term.writeln("  at " + exception.fileName + ":" + exception.lineNumber);
    }
    term.writeln("");
};

/**
 * Display the summary of a unit test(suite) execution
 * @param {Object} summary The unit test summary
 */
TermWriter.prototype.writeSummary = function(summary) {
    if (summary.testsRun > 0) {
        term.writeln("--------------------------------------------------------------------------------");
        term.writeln("Executed", summary.testsRun, "tests in", summary.time, "ms ");
        term.writeln(term.BOLD, "Passed", summary.passed + ";", "Failed", summary.failures + ";", "Errors", summary.errors + ";");
    } else {
        term.writeln("No tests found");
    }
};
/**
 * Creates a new EvaluationError instance
 * @class Instances of this class represent an exception thrown when evaluating
 * a test file or a single test function
 * @param {Object} messageOrException Either a message string or the exception
 * thrown when evaluating
 * @returns A newly created EvaluationError instance
 * @constructor
 * @exteds TestException
 */
const EvaluationError = function(messageOrException) {
    let message = undefined;
    let exception = null;
    let stackTrace = null;
    let fileName = null;
    let lineNumber = -1;

    if (messageOrException instanceof Error) {
        exception = messageOrException;
    } else if (typeof(messageOrException.toString) === 'function') {
        message = messageOrException.toString();
    } else {
        message = messageOrException;
    }

    if (exception != null) {
        if (exception.rhinoException != null) {
            const e = exception.rhinoException;
            message += e.details();
            stackTrace = getStackTrace(e.getStackTrace());
        } else if (exception instanceof Error) {
            message = exception.message;
        }
        if (!stackTrace) {
            // got no stack trace, so add at least filename and line number
            fileName = exception.fileName || null;
            lineNumber = exception.lineNumber || null;
        }
    }

    Object.defineProperties(this, {
        "message": {
            "value": message
        },
        "stackTrace": {
            "value": stackTrace
        },
        "fileName": {
            "value": fileName
        },
        "lineNumber": {
            "value": lineNumber
        }
    });

    return this;
};
EvaluationError.prototype = Object.create(Error.prototype);
EvaluationError.prototype.constructor = EvaluationError;

/**
 * Executed when called from the command line
 */
if (require.main === module) {
    const system = require("system");
    if (system.args.length === 1) {
        term.writeln("Usage: bin/ringo test test/file1 test/file2");
    } else {
        const writer = new TermWriter();
        const failures = system.args.slice(1).reduce((result, arg) => {
            return result + this.run(arg, writer);
        }, 0);
        system.exit(failures);
    }
}
