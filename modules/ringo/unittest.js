import("core/string");
var term = require("ringo/term");
var fs = require("fs");

export(
    "run",
    "jsDump", // this is needed in selftests
    "ShellWriter",
    "assertTrue",
    "assertFalse",
    "assertEqual",
    "assertNotEqual",
    "assertNull",
    "assertNotNull",
    "assertUndefined",
    "assertNotUndefined",
    "assertNaN",
    "assertNotNaN",
    "assertStringContains",
    "assertMatch",
    "assertThrows"
);

/**
 * Converts the value passed as argument into a nicely formatted and
 * indented string
 * @param {Object} value The value to convert into a string
 * @param {Number} lvl Optional indentation level (defaults to zero)
 * @returns The string representation of the object passed as argument
 * @type String
 */
var jsDump = function(value, lvl) {
    if (!lvl) {
        lvl = 0;
    }
    
    switch (getType(value)) {
        case "string":
            return jsDump.quote(value);
        case "boolean":
        case "number":
        case "nan":
        case "date":
        case "regexp":
            return value.toString();
        case "undefined":
        case "null":
            return String(value);
        case "function":
            return value.toSource();
        case "array":
            var buf = value.map(function(val) {
                return jsDump.indent(lvl + 1) + jsDump(val, lvl + 1);
            });
            return ["[", buf.join(",\n"), jsDump.indent(lvl) + "]"].join("\n");
        case "object":
            var buf = [];
            for (var propName in value) {
                buf.push(jsDump.indent(lvl + 1) + '"' + propName + '": ' + jsDump(value[propName], lvl + 1));
            }
            return ["{", buf.join(",\n"), jsDump.indent(lvl) + "}"].join("\n");
    }
};
jsDump.indent = function(lvl) {
    return " ".repeat(4 * lvl);
};
jsDump.quote = function(str) {
    return '"' + str.toString().replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
};

/**
 * Creates a stack trace and parses it for display.
 * @param {java.lang.StackTraceElement} trace The trace to parse. If not given
 * a stacktrace will be generated
 * @returns The parsed stack trace
 * @type String
 */
var getStackTrace = function(trace) {
    // create exception and fill in stack trace
    if (!trace) {
        var ex = new Packages.org.mozilla.javascript.EvaluatorException("");
        ex.fillInStackTrace();
        trace = ex.getStackTrace();
    }
    var stack = [];
    var el, fileName, lineNumber;
    for (var i = 0; i < trace.length; i += 1) {
        el = trace[i];
        fileName = el.getFileName();
        lineNumber = el.getLineNumber();
        if (fileName != null && lineNumber > -1 && fileName.endsWith(".js")) {
            // exclude all lines containing the unittest module itself
            if (fileName == this.__path__) {
                continue;
            }
            stack.push("at " + fileName + ":" + lineNumber);
        }
    }
    return stack;
};

/**
* @param {Object} args The arguments array.
* @param {Number} argsExpected The number of expected arguments
* @returns The comment appended to the expected arguments, if any
* @type String
*/
var evalArguments = function(args, argsExpected) {
   if (!(args.length == argsExpected ||
           (args.length == argsExpected + 1 && typeof(args[args.length - 1]) == "string"))) {
       throw new ArgumentsException("Insufficient arguments passed to assertion function");
   }
   return args[argsExpected];
};

/**
 * The main runner method
 * @param {String|Object} modulePathOrScope Either the path to a module containing unit
 * tests to execute, or an object containing the exported test methods or nested scopes.
 * @param {Object} writer Optional writer to use for displaying the test results. Defaults
 * to TermWriter.
 */
this.run = function(modulePathOrScope, writer) {
    var scope;
    if (typeof(modulePathOrScope) === "string") {
        scope = require(fs.resolve(fs.workingDirectory(), modulePathOrScope));
    } else {
        scope = modulePathOrScope;
    }
    if (!writer) {
        writer = new TermWriter();
    }
    var summary = {
        "testsRun": 0,
        "passed": 0,
        "errors": 0,
        "failures": 0,
        "time": 0
    };
    writer.writeHeader(modulePathOrScope);
    executeTestScope(scope, summary, writer, []);
    scope = null;
    writer.writeSummary(summary);
    return;
};

/**
 * Loops over all properties of a test scope and executes all methods whose
 * name starts with "test".
 * @param {Object} scope The scope object containing the test functions
 * @param {Object} summary An object containing summary information
 * @param {Object} writer A writer instance for displaying test results
 * @param {Array} path An array containing property path segments
 */
var executeTestScope = function(scope, summary, writer, path) {
    // loop over all exported properties and see if there are test methods to run
    for (var name in scope) {
        var value = scope[name];
        if (name.startsWith("test") && value instanceof Function) {
            writer.writeTestStart(name);
            var start = null;
            var time = 0;
            try {
                // execute setUp, if defined
                if (typeof(scope.setUp) === "function") {
                    scope.setUp();
                }
                // execute test function
                start = new Date();
                value();
                time = (new Date()).getTime() - start.getTime();
                writer.writeTestPassed(time);
                summary.passed += 1;
            } catch (e) {
                if (!(e instanceof TestException)) {
                    e = new EvaluatorException(e);
                }
                writer.writeTestFailed(e);
                if (e instanceof AssertionException) {
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
    }
    return;
};



/*************************************
 *****  S H E L L   W R I T E R  *****
 *************************************/



/**
 * Constructs a new TermWriter instance
 * @class Instances of this class represent a writer for displaying test results
 * in the shell
 * @returns A newly created TermWriter instance
 * @constructor
 */
var TermWriter = function() {
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
    term.writeln("=".repeat(80));
    return;
};

/**
 * Notification that we're entering a new test scope.
 * @param name the name of the test scope
 */
TermWriter.prototype.enterScope = function(name) {
    term.writeln(this.indent, "+ Running", name, "...");
    this.indent += "  ";
};

/**
 * Notification that we're leaving a test scope.
 * @param name the name of the test scope
 */
TermWriter.prototype.exitScope = function(name) {
    this.indent = this.indent.substring(2);
};

/**
 * Display the beginning of a test function execution
 * @param {String} name The name of the test function about to be executed
 */
TermWriter.prototype.writeTestStart = function(name) {
    term.write(this.indent, "+ Running", name, "...");
    return;
};

/**
 * Display a passed test method execution
 * @param {Number} time The time the execution of the test method took
 */
TermWriter.prototype.writeTestPassed = function(time) {
    term.writeln(term.BOLD, " PASSED", term.RESET, "(" + time + " ms)");
    return;
};

/**
 * Display a failed test
 * @param {Object} exception The exception thrown during test method execution
 */
TermWriter.prototype.writeTestFailed = function(exception) {
    term.writeln(term.BOLD, term.WHITE, term.ONRED, " FAILED ");
    exception.message.split(/\n/).forEach(function(line) {
        term.writeln(" ".repeat(2), term.BOLD, term.RED, line);
    });
    if (exception.stackTrace != null) {
        exception.stackTrace.forEach(function(line) {
            term.writeln(" ".repeat(2), term.BOLD, line);
        });
    }
    term.writeln("");
    return;
};

/**
 * Display the summary of a unit test(suite) execution
 * @param {Object} summary The unit test summary
 */
TermWriter.prototype.writeSummary = function(summary) {
    if (summary.testsRun > 0) {
        term.writeln("-".repeat(80));
        term.writeln("Executed", summary.testsRun, "tests in", summary.time, "ms ");
        term.writeln(term.BOLD, "Passed", summary.passed + ";", "Failed", summary.failures + ";", "Errors", summary.errors + ";");
    } else {
        term.writeln("No tests found");
    }
    return;
};




/*********************************
 *****  E X C E P T I O N S  *****
 *********************************/



/**
 * Creates a new TestException instance
 * @class Instances of this class represent a basic test exception
 * @param {String} message The exception message
 * @returns A newly creatd TestException instance
 * @constructor
 */
var TestException = function(message) {

    /**
     * The exception message
     * @type String
     */
    Object.defineProperty(this, "message", {
        get: function() {
            return message;
        }
    });

    return this;
};

/** @ignore */
TestException.prototype.toString = function() {
    return "[TestException '" + this.message + "']";
};

/**
 * Creates a new ArgumentsException instance
 * @class Instances of this class represent an exception thrown if insufficient
 * arguments have been passed to an assertion function
 * @param {String} message The exception message
 * @returns A newly created ArgumentsException instance
 * @constructor
 * @exteds TestException
 */
var ArgumentsException = function(message) {

    var stackTrace = getStackTrace();

    Object.defineProperty(this, "message", {
        get: function() {
            return message;
        }
    });

    Object.defineProperty(this, "stackTrace", {
        get: function() {
            return stackTrace;
        }
    });

    return this;
};
ArgumentsException.prototype = new TestException();

/**
 * Creates a new AssertionException instance
 * @class Instances of this class represent an exception thrown when an assertion
 * fails
 * @param {String} message The exception message
 * @param {String} comment An optional comment
 * @returns A newly created AssertionException instance
 * @constructor
 * @exteds TestException
 */
var AssertionException = function(message, comment) {

    var stackTrace = getStackTrace();

    Object.defineProperty(this, "comment", {
        get: function() {
            return comment;
        }
    });

    Object.defineProperty(this, "message", {
        get: function() {
            return message;
        }
    });

    Object.defineProperty(this, "stackTrace", {
        get: function() {
            return stackTrace;
        }
    });

    return this;
};
AssertionException.prototype = new TestException();

/**
 * Creates a new EvaluatorException instance
 * @class Instances of this class represent an exception thrown when evaluating
 * a test file or a single test function
 * @param {Object} messageOrException Either a message string or the exception
 * thrown when evaluating
 * @returns A newly created EvaluatorException instance
 * @constructor
 * @exteds TestException
 */
var EvaluatorException = function(messageOrException) {
    var message = "";
    var exception = null;
    var stackTrace = null;
    var fileName = null;
    var lineNumber = -1;

    Object.defineProperty(this, "message", {
        get: function() {
            return message;
        }
    });

    Object.defineProperty(this, "stackTrace", {
        get: function() {
            return stackTrace;
        }
    });

    Object.defineProperty(this, "fileName", {
        get: function() {
            return fileName;
        }
    });

    Object.defineProperty(this, "lineNumber", {
        get: function() {
            return lineNumber;
        }
    });

    /**
     * Main constructor body
     */
    if (messageOrException instanceof Error) {
        exception = messageOrException;
    } else {
        message = messageOrException;
    }

    if (exception != null) {
        if (exception.rhinoException != null) {
            var e = exception.rhinoException;
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
    return this;
};
EvaluatorException.prototype = new TestException();




/*************************************************
 *****  A S S E R T I O N   M E T H O D S   *****
 *************************************************/



/**
 * Returns the type of the object passed as argument. This is
 * heavily inspired by http://philrathe.com/articles/equiv and
 * tlrobinson's narwhal test module (http://github.com/tlrobinson/narwhal/)
 * @returns The type of the object passed as argument
 * @type String
 */
var getType = function(obj) {
    if (typeof(obj) === "string") {
        return "string";
    } else if (typeof(obj) === "boolean") {
        return "boolean";
    } else if (typeof (obj) === "number") {
        return (isNaN(obj) === true) ? "nan" : "number";
    } else if (typeof(obj) === "undefined") {
        return "undefined";
    } else if (obj === null) {
        return "null";
    } else if (obj instanceof Array) {
        return "array";
    } else if (obj instanceof Date) {
        return "date";
    } else if (obj instanceof RegExp) {
        return "regexp";
    } else if (obj instanceof Function) {
        return "function";
    }
    return "object";
};

/**
 * Helper method useable for displaying a value
 * @param {Object} The value to render
 * @returns The value rendered as string
 * @type String
 * @static
 */
var valueToString = function(val, lvl) {
    // pre-indent the stringified value
    return jsDump(val).split(/\n/).map(function(line) {
        return " ".repeat(3) + line;
    }).join("\n");
};

/**
 * Contains the comparator functions for various JS types.This is
 * heavily inspired by http://philrathe.com/articles/equiv and
 * tlrobinson's narwhal test module (http://github.com/tlrobinson/narwhal/)
 * @type Object
 * @final
 */
var comparators = (function() {
    var isStrictlyEqual = function(a, b) {
        return a === b;
    };

    return {
        "string": isStrictlyEqual,
        "boolean": isStrictlyEqual,
        "number": isStrictlyEqual,
        "null": isStrictlyEqual,
        "undefined": isStrictlyEqual,
        "nan": function(nr) {
            return isNaN(nr);
        },
        "array": function(a1, a2) {
            if (getType(a2) !== "array" || a1.length !== a2.length) {
                return false;
            }
            if (a1.length > 0) {
                return a1.every(function(val, idx) {
                    return isEqual(val, a2[idx]);
                });
            }
            return true;
        },
        "date": function(d1, d2) {
            return getType(d2) === "date" &&
                   d1.valueOf() === d2.valueOf();
        },
        "regexp": function(r1, r2) {
            return getType(r2) === "regexp" &&
                   r1.source === r2.source &&
                   r1.global === r2.global &&
                   r1.ignoreCase === r2.ignoreCase &&
                   r1.multiline === r2.multiline;
        },
        "function": function(f1, f2) {
            return getType(f2) === "function" &&
                   f1.toSource() === f2.toSource();
        },
        "object": function(obj1, obj2) {
            if (getType(obj2) !== "object" || obj1.constructor !== obj2.constructor) {
                return false;
            }
            var obj1props = [];
            var obj2props = [];
            for (var name in obj1) {
                obj1props.push(name);
                // compare the values
                if (isEqual(obj1[name], obj2[name]) === false) {
                    return false;
                }
            }
            for (var name in obj2) {
                obj2props.push(name);
            }
            // finally compare property names to see if the objects don't exactly
            // contain the same properties
            return isEqual(obj1props.sort(), obj2props.sort());
        }
    };
})();

/**
 * Generic comparison method, used in assertion methods
 * @param {Object} val1 The value to be compared
 * @param {Object} val2 The value to compare with
 */
var isEqual = function(val1, val2) {
    var type = getType(val1);
    var comparator = comparators[type];
    return comparator(val1, val2);
};

/**
 * Generic comparison method, used in assertion methods
 * @param {Object} val1 The value to be compared
 * @param {Object} val2 The value to compare with
 */
var isNotEqual = function(val1, val2) {
    return isEqual(val1, val2) === false;
};

/**
 * Checks if the value passed as argument is boolean true.
 * @param {Object} val The value that should be boolean true.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertTrue = function assertTrue(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (getType(value) !== "boolean") {
        throw new ArgumentsException("Invalid argument to assertTrue(boolean): " +
                             valueToString(value));
    } else if (value !== true) {
        throw new AssertionException("assertTrue(boolean) called with argument " +
                             valueToString(value), comment);
    }
    return;
};

/**
 * Checks if the value passed as argument is boolean false.
 * @param {Object} val The value that should be boolean false.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertFalse = function assertFalse(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (getType(value) !== "boolean") {
        throw new ArgumentsException("Invalid argument to assertFalse(boolean): " +
                             valueToString(value));
    } else if (value === true) {
        throw new AssertionException("assertFalse(boolean) called with argument " +
                             valueToString(value), comment);
    }
    return;
};

/**
 * Checks if the values passed as arguments are equal.
 * @param {Object} val1 The value that should be compared to the second argument.
 * @param {Object} val2 The value that should be compared to the first argument.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertEqual = function assertEqual(value1, value2) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (isNotEqual(value1, value2)) {
        throw new AssertionException("Expected\n" + valueToString(value1) +
                             "\nto be equal to\n" + valueToString(value2), comment);
    }
    return;
};

/**
 * Checks if the values passed as arguments are not equal.
 * @param {Object} val1 The value that should be compared to the second argument.
 * @param {Object} val2 The value that should be compared to the first argument.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertNotEqual = function assertNotEqual(value1, value2) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (isEqual(value1, value2)) {
        throw new AssertionException("Expected\n" + valueToString(value1) +
                             "\nto be not equal to\n" + valueToString(value2),
                             comment);
    }
    return;
};

/**
 * Checks if the value passed as argument is null.
 * @param {Object} val The value that should be null.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertNull = function assertNull(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (value !== null) {
        throw new AssertionException("Expected\n" + valueToString(value) +
                                    "\nto be null", comment);
    }
    return;
};

/**
 * Checks if the value passed as argument is not null.
 * @param {Object} val The value that should be not null.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertNotNull = function assertNotNull(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (value === null) {
        throw new AssertionException("Expected\n" + valueToString(value) +
                                    "\nto be not null", comment);
    }
    return;
};

/**
 * Checks if the value passed as argument is undefined.
 * @param {Object} val The value that should be undefined.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertUndefined = function assertUndefined(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (value !== undefined) {
        throw new AssertionException("Expected\n" + valueToString(value) +
                                    "\nto be undefined", comment);
    }
    return;
};

/**
 * Checks if the value passed as argument is not undefined.
 * @param {Object} val The value that should be not undefined.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertNotUndefined = function assertNotUndefined(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (value === undefined) {
        throw new AssertionException("Expected argument to be not undefined", comment);
    }
    return;
};

/**
 * Checks if the value passed as argument is NaN.
 * @param {Object} val The value that should be NaN.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertNaN = function assertNaN(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (isNaN(value) === false) {
        throw new AssertionException("Expected\n" + valueToString(value) +
                                    "\nto be NaN", comment);
    }
    return;
};

/**
 * Checks if the value passed as argument is not NaN.
 * @param {Object} val The value that should be not NaN.
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertNotNaN = function assertNotNaN(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (isNaN(value) === true) {
        throw new AssertionException("Expected\n" + valueToString(value) +
                                    "\nto be a number", comment);
    }
    return;
};

/**
 * Checks if the value passed as argument contains the pattern specified.
 * @param {String} val The string that should contain the pattern
 * @param {String} str The string that should be contained
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertStringContains = function assertStringContains(value, pattern) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (getType(pattern) === "string") {
        if (value.indexOf(pattern) < 0) {
            throw new AssertionException("Expected string\n" + valueToString(pattern) +
                                        "\nto be found in\n" + valueToString(value), comment);
        }
    } else {
        throw new ArgumentsException("Invalid argument to assertStringContains(string, string):\n" +
                             valueToString(pattern));
    }
    return;
};

/**
 * Checks if the regular expression matches the string.
 * @param {String} val The string that should contain the regular expression pattern
 * @param {RegExp} rxp The regular expression that should match the value
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertMatch = function assertMatch(value, expr) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (getType(expr) === "regexp") {
        if (expr.test(value) == false) {
            throw new AssertionException("Expected pattern\n" + valueToString(expr) +
                                        "\nto match\n" + valueToString(value), comment);
        }
    } else {
        throw new ArgumentsException("Invalid argument to assertMatch(string, regexp):\n" +
                             valueToString(expr));
    }
    return;
};

/**
 * Checks if the function passed as argument throws a defined exception.
 * @param {Object} func The function to call
 * @param {Object} exception Optional object expected to be thrown when executing
 * the function
 * @throws ArgumentsException
 * @throws AssertionException
 */
this.assertThrows = function assertThrows(func, exception) {
    if (!(func instanceof Function)) {
        throw new ArgumentsException("First argument to assertThrows must be a function");
    }
    try {
        func();
    } catch (e) {
        var isExpected = false;
        var thrown = e;
        if (exception == null) {
            // didn't expect an exception, so accept everything
            isExpected = true;
        } else if (exception != null && e != null) {
            // check if exception is the one expected
            switch (typeof(exception)) {
                case "string":
                    isExpected = (e.name === exception || e === exception);
                    break;
                case "function":
                    // this is true for all JS constructors and Java classes!
                    isExpected = (e instanceof exception ||
                                      (thrown = e.rhinoException) instanceof exception ||
                                      (thrown = e.javaException) instanceof exception);
                    break;
                case "number":
                case "boolean":
                default:
                    isExpected = (e === exception);
                    break;
            }
        }
        if (!isExpected) {
            throw new AssertionException("Expected\n" + valueToString(exception) +
                              "\nbeing thrown, but got\n" + valueToString(e) +
                              "\ninstead");
        }
        return;
    }
    throw new AssertionException("Expected exception\n" + valueToString(exception) +
                    "\nbeing thrown");
    return;
};

/**
 * Executed when called from the command line
 */
if (require.main == module.id) {
    if (system.args.length == 1) {
        term.writeln("Usage: bin/ringo ringo/unittest test/file1 test/file2");
    } else {
        var writer = new TermWriter();
        for (var i=1; i<system.args.length; i+=1) {
            this.run(system.args[i], writer);
        }
    }
}
