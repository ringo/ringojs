import("core.string");
import("helma.system");
import("helma.shell");

var system = helma.system;
var writeln = helma.shell.writeln;

var __shared__ = true;

export("TestCase",
        "TestSuite",
        "assertEqual",
        "assertEqualArrays",
        "assertEqualValues",
        "assertEqualObjects",
        "assertNotEqual",
        "assertTrue",
        "assertFalse",
        "assertMatch",
        "assertNaN",
        "assertNotNaN",
        "assertUndefined",
        "assertNotUndefined",
        "assertNull",
        "assertNotNull",
        "assertStringContains",
        "assertThrows",
        "run");

(function() {


    /*********************************************
     *****  P R I V A T E    M E T H O D S   *****
     *********************************************/

    /**
     * @param {Number} nr The number of arguments to be expected
     * @param {Object} args The arguments array.
     * @returns True in case the number of arguments matches
     * the expected amount, false otherwise.
     * @type Boolean
     */
    var evalArguments = function(args, argsExpected) {
        if (!(args.length == argsExpected ||
                (args.length == argsExpected + 1 && typeof(args[args.length - 1]) == "string"))) {
            throw new ArgumentsException("Insufficient arguments passed to assertion function");
        }
        return;
    };

    /**
     * Helper method useable for displaying a value
     * @param {Object} The value to render
     * @returns The value rendered as string
     * @type String
     * @static
     */
    var valueToString = function(val) {
        var buf = [];
        if (val === null) {
            buf.push("null");
        } else if (val === undefined) {
            buf.push("undefined");
        } else {
            if (typeof(val) == "function") {
                // functions can be either JS methods or Java classes
                // the latter throws an exception when trying to access a property
                try {
                    buf.push(val.name || val);
                } catch (e) {
                    buf.push(val);
                }
            } else {
                if (val.constructor && val.constructor == String) {
                    buf.push('"' + val.head(200) + '"');
                } else {
                    buf.push(val.toString());
                }
                buf.push(" (");
                if (val.constructor && val.constructor.name != null) {
                    buf.push(val.constructor.name);
                } else {
                    buf.push(typeof(val));
                }
                buf.push(")");
            }
        }
        return buf.join("");
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
     * Creates a new ShellWriter instance
     * @class Instances of this class provide functionality for displaying
     * a test result inside a shell
     * @returns A newly created ShellWrite instance
     * @constructor
     */
    var ShellWriter = function() {

        /**
         * Helper method for pluralizing a word.
         * @param {String} singular The singular form of the word
         * @param {String} plural The plural form of the word
         * @param {Number} cnt The counter used to determine singular or plural
         * @returns The singular or plural version, depending on the counter
         * @type String
         * @private
         */
        var pluralize = function(singular, plural, cnt) {
            if (cnt === 0 || cnt > 1) {
                return plural;
            }
            return singular;
        };

        /**
         * Renders a single test result
         * @param {TestResult} result The result to render
         * @private
         */
        var writeTestResult = function(result) {
            writeln("Executing", result.test.constructor.name, "'" + result.test.name + "'", "...");
            result.log.forEach(function(logItem) {
                if (logItem instanceof TestResult) {
                    writeln("-------------------------------------------------------------------------------");
                    writeTestResult(logItem);
                } else {
                    writeExecutionResult(logItem);
                }
                return;
            }, this);
            return;
        };

        /**
         * Renders a single test execution result
         * @param {ExecutionResult} result The execution result to render
         * @private
         */
        var writeExecutionResult = function(result) {
            if (result.wasSuccessful() === true) {
                writeln("PASSED:", result.name, "(" + result.time, "ms)");
            } else {
                if (result.exception instanceof FailureException) {
                    writeln("FAILED:", result.name);
                } else {
                    writeln("ERROR:", result.name);
                }
                if (result.exception.comment != null) {
                    writeln("   ", result.exception.comment);
                }
                writeln("   ", result.exception.message);
                if (result.exception.stackTrace != null) {
                    result.exception.stackTrace.forEach(function(line) {
                        writeln("   ", line);
                    });
                }
            }
            return;
        };

        /**
         * Renders the test result passed as argument
         * @param {TestResult} result The test result to render
         */
        this.write = function(result) {
            writeln("===============================================================================");
            if (result != null) {
                writeTestResult(result);
                writeln("===============================================================================");
                writeln("Ran", result.testsRun,
                          pluralize("test", "tests", result.testsRun),
                          "in", result.time, "ms",
                          "(" + result.failures, pluralize("failure", "failures", result.failures) + ",",
                          result.errors, pluralize("error", "errors", result.errors) + ")");
            } else {
                writeln("No tests found");
            }
            return;
        };

        return this;
    };

    /** @ignore */
    ShellWriter.prototype.toString = function() {
        return "[ShellWriter]";
    };


    /**
     * Creates a new TestResult instance
     * @class Instances of this class represent the result of the execution of a
     * single test file
     * @param {TestCase | TestSuite} test The test case or suite instance
     * @returns A newly created TestResult instance
     * @constructor
     */
    var TestResult = function(test) {
        var log = [];
        var testsRun = 0;
        var errors = 0;
        var failures = 0;
        var time = 0;
        var start = null;

        /**
         * The test case or suite instance
         * @type TestCase | TestSuite
         */
        this.__defineGetter__("test", function() {
            return test;
        });

        /**
         * The log containing the ExecutionResult objects
         * @type Array
         */
        this.log = undefined; // for documentation purposes only
        this.__defineGetter__("log", function() {
            return log;
        });

        this.__defineGetter__("errors", function() {
            return errors;
        });

        this.__defineGetter__("failures", function() {
            return failures;
        });

        this.__defineGetter__("testsRun", function() {
            return testsRun;
        });

        this.__defineGetter__("time", function() {
            return time;
        });

        this.hasErrors = function() {
            return errors > 0;
        };

        this.hasFailures = function() {
            return failures > 0;
        };

        this.wasSuccessful = function() {
            return (this.hasErrors() === false && this.hasFailures() === false);
        };

        this.add = function(result) {
            log.push(result);
            if (result instanceof TestResult) {
                if (result.wasSuccessful() === false) {
                    failures += result.failures;
                    errors += result.errors;
                }
                testsRun += result.testsRun;
            } else {
                if (result.exception instanceof FailureException) {
                    failures += 1;
                } else if (result.exception instanceof TestException) {
                    errors += 1;
                }
                testsRun += 1;
            }
            time += result.time;
            return;
        };

        return this;
    };

    /** @ignore */
    TestResult.prototype.toString = function() {
        return "[TestResult (" + this.testsRun + ")]";
    };

    /**
     * Creates a new ExecutionResult instance
     * @class Instances of this class represent the result of the execution of
     * a single testcase method
     * @param {String} name The name of the result (normally the name of the method
     * executed)
     * @param {Object} exception An optional exception thrown during test method
     * execution
     * @returns A newly created ExecutionResult instance
     * @constructor
     */
    var ExecutionResult = function(name, exception) {
        var start = null;
        var time = 0;

        this.__defineGetter__("name", function() {
            return name;
        });

        this.__defineGetter__("time", function() {
            return time;
        });

        this.__defineGetter__("exception", function() {
            return exception || null;
        });

        this.__defineSetter__("exception", function(e) {
            exception = e;
            return;
        });

        this.wasSuccessful = function() {
            return exception == null;
        };

        this.startTimer = function() {
            start = new Date();
            return;
        };

        this.stopTimer = function() {
            time = (new Date()) - start;
            start = null;
            return;
        };

        return this;
    };



    /***********************************
     *****  E X C E P T I O N S  *****
     ***********************************/



    /**
     * Creates a new TestException instance
     * @class Instances of this class represent a basic test exception
     * @param {String} message The exception message
     * @returns A newly creatd TestException instance
     * @constructor
     */
    var TestException = function(message) {

        /**
         * The exeption message
         * @type String
         */
        this.__defineGetter__("message", function() {
            return message;
        });

        return this;
    };

    /** @ignore */
    TestException.prototype.toString = function() {
        return "[TestException '" + this.message + "']";
    };

    /**
     * Creates a new FailureException instance
     * @class Instances of this class represent an exception thrown if an assertion
     * fails
     * @param {String} message The exception message
     * @param {String} comment An optional comment
     * @returns A newly created FailureException instance
     * @constructor
     * @exteds TestException
     */
    var FailureException = function(message, comment) {

        var stackTrace = getStackTrace();

        this.__defineGetter__("comment", function() {
            return comment;
        });

        this.__defineGetter__("message", function() {
            return message;
        });

        this.__defineGetter__("stackTrace", function() {
            return stackTrace;
        });

        return this;
    };
    FailureException.prototype = new TestException();

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

        this.__defineGetter__("message", function() {
            return message;
        });

        this.__defineGetter__("stackTrace", function() {
            return stackTrace;
        });

        this.__defineGetter__("fileName", function() {
            return fileName;
        });

        this.__defineGetter__("lineNumber", function() {
            return lineNumber;
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

        this.__defineGetter__("message", function() {
            return message;
        });

        this.__defineGetter__("stackTrace", function() {
            return stackTrace;
        });

        return this;
    };
    ArgumentsException.prototype = new TestException();




    /*******************************************
     *****  P U B L I C   M E T H O D S *****
     *******************************************/




    /**
     * Runs the test with the given name, and displays the result in the shell
     * @param {String} test The name of the test module to run
     */
    this.run = function(test) {
        var testResult;
        var scope = require(test || this.__name__);
        for (var propName in scope) {
            var prop = scope[propName];
            if (prop instanceof TestCase || prop instanceof TestSuite) {
                if (!testResult) {
                    testResult = prop.execute(new TestResult(prop));
                } else {
                    testResult.add(prop.execute(new TestResult(prop)));
                }
            }
        }
        (new ShellWriter()).write(testResult);
        return;
    };

    /**
     * Creates a new TestCase instance
     * @class Instances of this class represent a single test case which can
     * contain any number of test methods. In addition two special methods
     * "setUp" and "tearDown" can be defined, which will be executed right
     * before and after every single method of a test case.
     * @param {String} name The name of the test case. This will be used
     * when displaying the results in the shell
     * @returns A newly created TestCase instance
     * @constructor
     */
    this.TestCase = function TestCase(name) {

        /**
         * The name of the TestCase
         * @type String
         */
        this.__defineGetter__("name", function() {
            return name;
        });

        return this;

        /*
        // use this constructor once utilizing JSAdapter doesn't
        // break instanceof
        var methods = new java.util.LinkedHashMap();

        this.__put__ = function(propName, value) {
            methods.put(propName, value);
            return;
        };

        this.__has__ = function(propName) {
            return propName === "name" || methods.containsKey(propName);
        };

        this.__get__ = function(propName) {
            if (propName === "name") {
                return name;
            }
            return methods.get(propName);
        };

        this.__delete__ = function(propName) {
            methods.remove(propName);
            return;
        };

        this.__getIds__ = function() {
            return methods.keySet().toArray();
        };

        return new JSAdapter(this);
        */
    };

    /** @ignore */
    this.TestCase.prototype.toString = function() {
        return "[TestCase '" + this.name + "']";
    };

    /**
     * Runs this TestCase, displaying the results in the shell
     * @param {String} methodName Optional method name, restricting the execution
     * to only this method
     */
    this.TestCase.prototype.run = function(methodName) {
        var testResult = new TestResult(this);
        (new ShellWriter()).write(this.execute(testResult, methodName));
        return;
    };

    /**
     * Executes either a single method or all test methods of this TestCase instance
     * @param {TestResult} testResult The testresult object used to store the execution
     * result(s)
     * @param {String} methodName Optional methodname to execute
     * @returns The TestResult object passed as argument
     * @type TestResult
     */
    this.TestCase.prototype.execute = function(testResult, methodName) {
        if (methodName != null) {
            // execute setUp method if defined
            if (this.setUp !== null && this.setUp instanceof Function) {
                try {
                    this.setUp();
                } catch (e) {
                    testResult.add(new ExecutionResult("setUp", e));
                    // stop executing the test since setup method failed
                    return testResult;
                }
            }

            var execResult = new ExecutionResult(methodName);
            execResult.startTimer();
            try {
                if (!this[methodName] || this[methodName].constructor != Function) {
                    throw new EvaluatorException("Test method '" + methodName +
                                          "' is either not defined or not a function.");
                }
                this[methodName]();
            } catch (e) {
                if (!(e instanceof TestException)) {
                    e = new EvaluatorException(e);
                }
                execResult.exception = e;
            } finally {
                execResult.stopTimer();
                testResult.add(execResult);
            }

            // execute tearDown method if defined
            if (this.tearDown !== null && this.tearDown instanceof Function) {
                try {
                    this.tearDown();
                } catch (e) {
                    testResult.add(new ExecutionResult("tearDown", e));
                }
            }
        } else {
            // execute all methods of this TestCase instance whose name
            // starts with "test"
            for (var name in this) {
                if (name.indexOf("test") === 0) {
                    this.execute(testResult, name);
                }
            }
        }
        return testResult;
    };




    /**
     * Creates a new TestSuite instance
     * @class TestSuite instances can contain any number of TestCases and/or
     * other TestSuites and allow them all to be executed within one run.
     * @param {String} name The name of the TestSuite, which will be used
     * when displaying the results in the shell
     * @returns A newly created TestSuite instance
     * @constructor
     */
    this.TestSuite = function TestSuite(name) {
        var tests = [];

        /**
         * The tests of this TestSuite instance
         * @type Array
         */
        this.__defineGetter__("tests", function() {
            return tests;
        });

        /**
         * The name of the test suite
         * @type String
         */
        this.__defineGetter__("name", function() {
            return name;
        });

        return this;
    };

    /** @ignore */
    this.TestSuite.prototype.toString = function() {
        return "[TestSuite '" + this.name + "' (" + this.tests.length + " tests)]";
    };

    /**
     * Adds a test to this test suite
     * @param {String} moduleName The name of the test module to add
     */
    this.TestSuite.prototype.addTest = function(moduleName) {
        this.tests.push(moduleName);
        return;
    };

    /**
     * Executes all tests of this suite
     * @param {TestResult} testResult The object to add the test results to
     * @returns The TestResult object passed as argument
     * @type TestResult
     */
    this.TestSuite.prototype.execute = function(testResult) {
        for (var i = 0; i < this.tests.length; i += 1) {
            var test = this.tests[i];
            var scope = require(test);
            for (var propName in scope) {
                var prop = scope[propName];
                if (prop instanceof TestCase) {
                    testResult.add(prop.execute(new TestResult(prop)));
                }
            }
        };
        return testResult;
    };

    /**
     * Runs all tests of this test suite
     */
    this.TestSuite.prototype.run = function() {
        var testResult = new TestResult(this);
        (new ShellWriter()).write(this.execute(testResult));
        return;
    };




    /*************************************************
     *****  A S S E R T I O N   M E T H O D S   *****
     *************************************************/




    /**
     * Checks if the value passed as argument is boolean true.
     * @param {Object} val The value that should be boolean true.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertTrue = function assertTrue(value) {
        var functionName = arguments.callee.name;
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (typeof(value) !== "boolean") {
            throw new ArgumentsException("Invalid argument to assertTrue(boolean): " +
                                 valueToString(value));
        } else if (value !== true) {
            var comment = arguments[argsExpected];
            throw new FailureException("assertTrue(boolean) called with argument " +
                                 valueToString(value), comment);
        }
        return;
    };

    /**
     * Checks if the value passed as argument is boolean false.
     * @param {Object} val The value that should be boolean false.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertFalse = function assertFalse(value) {
        var functionName = arguments.callee.name;
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (typeof(value) !== "boolean") {
            throw new ArgumentsException("Invalid argument to assertFalse(boolean): " +
                                 valueToString(value));
        } else if (value === true) {
            var comment = arguments[argsExpected];
            throw new FailureException("assertFalse(boolean) called with argument " +
                                 valueToString(value), comment);
        }
        return;
    };

    /**
     * Checks if the values passed as arguments are equal.
     * @param {Object} val1 The value that should be compared to the second argument.
     * @param {Object} val2 The value that should be compared to the first argument.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertEqual = function assertEqual(value1, value2) {
        var functionName = arguments.callee.name;
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (value1 !== value2) {
            var comment = arguments[argsExpected];
            throw new FailureException("Expected " + valueToString(value1) +
                                 " to be equal to " + valueToString(value2), comment);
        }
        return;
    };

    /**
     * Checks if the values passed as arguments are not equal.
     * @param {Object} val1 The value that should be compared to the second argument.
     * @param {Object} val2 The value that should be compared to the first argument.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertNotEqual = function assertNotEqual(value1, value2) {
        var functionName = arguments.callee.name;
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (value1 === value2) {
            var comment = arguments[argsExpected];
            throw new FailureException("Expected " + valueToString(value1) +
                                 " to be not equal to " + valueToString(value2),
                                 comment);
        }
        return;
    };

    /**
     * Checks if the values passed as arguments are arrays and contain the same elements
     * @param value1 the first array
     * @param value2 the second array
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertEqualArrays = function(value1, value2) {
        var functionName = arguments.callee.name;
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (!(value1 instanceof Array) || !(value2 instanceof Array)) {
            throw new ArgumentsException("Invalid arguments to assertEqualArrays: " +
                      valueToString(value1) + ", " + valueToString(value2));
        }
        var equal = true;
        if (value1.length != value2.length) {
             equal = false;
        };
        for (var i = 0; i < value1.length; i++) {
            if (value1[i] !== value2[i]) {
                 equal = false;
            }
        }
        if (!equal) {
             throw new FailureException("Expected " + valueToString(value1) +
                                        " to be equal to " + valueToString(value2))
        }
        return;
    };

    /**
     * Checks if the arguments are objects and the value associated with a key
     * is the same in both objects (for all keys of both objects):
     *   for all k1 in o1, k2 in o2: o1[k1] == o2[k1] && o1[k2] == o2[k2]
     */
    this.assertEqualObjects = function(value1, value2) {
        var functionName = arguments.callee.name;
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (!(value1 instanceof Object) || !(value2 instanceof Object)) {
            throw new ArgumentsException(
                    "Invalid arguments to assertEqualObjects: " +
                    valueToString(value1) + ", " + valueToString(value2));
        }

        var equal = true;
        for (var k1 in value1) {
            if (value1[k1] != value2[k1]) {
                equal = false;
                break;
            }
        }
        if (equal) {
            for (var k2 in value2) {
                if (value1[k2] != value2[k2]) {
                    equal = false;
                    break;
                }
            }
        }
        if (!equal) {
            throw new FailureException("Exepected " + valueToString(value1) +
                                 " to be equal to " + valueToString(value2));
        }
    };

    /**
     * Checks if the value passed as argument is null.
     * @param {Object} val The value that should be null.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertNull = function assertNull(value) {
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (value !== null) {
            var comment = arguments[argsExpected];
            throw new FailureException("Expected " + valueToString(value) +
                                        " to be null", comment);
        }
        return;
    };

    /**
     * Checks if the value passed as argument is not null.
     * @param {Object} val The value that should be not null.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertNotNull = function assertNotNull(value) {
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (value === null) {
            var comment = arguments[argsExpected];
            throw new FailureException("Expected " + valueToString(value) +
                                        " to be not null", comment);
        }
        return;
    };

    /**
     * Checks if the value passed as argument is undefined.
     * @param {Object} val The value that should be undefined.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertUndefined = function assertUndefined(value) {
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (value !== undefined) {
            var comment = arguments[argsExpected];
            throw new FailureException("Expected " + valueToString(value) +
                                        " to be undefined", comment);
        }
        return;
    };

    /**
     * Checks if the value passed as argument is not undefined.
     * @param {Object} val The value that should be not undefined.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertNotUndefined = function assertNotUndefined(value) {
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (value === undefined) {
            var comment = arguments[argsExpected];
            throw new FailureException("Expected argument to be not undefined", comment);
        }
        return;
    };

    /**
     * Checks if the value passed as argument is NaN.
     * @param {Object} val The value that should be NaN.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertNaN = function assertNaN(value) {
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (isNaN(value) === false) {
            var comment = arguments[argsExpected];
            throw new FailureException("Expected " + valueToString(value) +
                                        " to be NaN", comment);
        }
        return;
    };

    /**
     * Checks if the value passed as argument is not NaN.
     * @param {Object} val The value that should be not NaN.
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertNotNaN = function assertNotNaN(value) {
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (isNaN(value) === true) {
            var comment = arguments[argsExpected];
            throw new FailureException("Expected " + valueToString(value) +
                                        " to be a number", comment);
        }
        return;
    };

    /**
     * Checks if the value passed as argument contains the pattern specified.
     * @param {String} val The string that should contain the pattern
     * @param {String} str The string that should be contained
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertStringContains = function assertStringContains(value, pattern) {
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (pattern.constructor == String) {
            if (value.indexOf(pattern) < 0) {
                var comment = arguments[argsExpected];
                throw new FailureException("Expected string " + valueToString(pattern) +
                                            " to be found in " + valueToString(value), comment);
            }
        } else {
            throw new ArgumentsException("Invalid argument to assertStringContains(string, string): " +
                                 valueToString(pattern));
        }
        return;
    };

    /**
     * Checks if the regular expression matches the string.
     * @param {String} val The string that should contain the regular expression pattern
     * @param {RegExp} rxp The regular expression that should match the value
     * @throws ArgumentsException
     * @throws FailureException
     */
    this.assertMatch = function assertMatch(value, expr) {
        var argsExpected = arguments.callee.length;
        evalArguments(arguments, argsExpected);
        if (expr.constructor == RegExp) {
            if (expr.test(value) == false) {
                var comment = arguments[argsExpected];
                throw new FailureException("Expected pattern " + valueToString(exp) +
                                            " to match " + valueToString(value), comment);
            }
        } else {
            throw new ArgumentsException("Invalid argument to assertMatch(string, regexp): " +
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
     * @throws FailureException
     */
    this.assertThrows = function assertThrows(func, exception) {
        if (!(func instanceof Function)) {
            throw new ArgumentsException("First argument to assertThrows must be a function");
        }

        var argsExpected = arguments.callee.length;
        var comment = arguments[argsExpected];
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
                throw new FailureException("Expected " + valueToString(exception) +
                                  " being thrown, but got '" + valueToString(e) +
                                  "' instead", comment);
            }
            return;
        }
        throw new FailureException("Expected exception " + valueToString(exception) +
                        " being thrown", comment);
        return;
    };

}).call(this);


if (__name__ == '__main__') {
    for each (var test in system.args) {
        run(test);
    }
}
