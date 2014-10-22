/**
 * @fileOverview Assertion library for unit testing.
 * It implements the [CommonJS Unit Testing](http://wiki.commonjs.org/wiki/Unit_Testing/1.0)
 * specification and adds some additional convenience methods.
 *
 * @example var assert = require('assert');
 * assert.deepEqual({b: 2, a: 1}, {a: 1, b: 2});
 * assert.isFalse(100 != 100);
 * assert.isNotNull(undefined);
 *
 * @see The <code><a href="../test/index.html">test</a></code> module is a test runner for unit tests.
 * It manages the execution of tests and provides the outcome to the user.
 */

export(
   "AssertionError",
   "ArgumentsError",
   "fail",
   // commonjs assertion methods
   "ok",
   "equal",
   "notEqual",
   "deepEqual",
   "notDeepEqual",
   "strictEqual",
   "notStrictEqual",
   "throws",
   // custom assertion methods
   "isTrue",
   "isFalse",
   "matches",
   "stringContains",
   "isNull",
   "isNotNull",
   "isUndefined",
   "isNotUndefined",
   "isNaN",
   "isNotNaN"
);

var {
    jsDump,
    getType,
    getStackTrace
} = require("./test");

/**
* @param {Object} args The arguments array.
* @param {Number} argsExpected The number of expected arguments
* @returns The comment appended to the expected arguments, if any
* @type String
*/
function evalArguments(args, argsExpected) {
    if (!(args.length == argsExpected ||
            (args.length == argsExpected + 1 && getType(args[args.length - 1]) == "string"))) {
        throw new ArgumentsError("Insufficient arguments passed to assertion function");
    }
    return args[argsExpected];
};

/**
 * Deep-compares both arguments.
 *
 * @param {Object} value1 The argument to be compared
 * @param {Object} value2 The argument to be compared to
 * @returns True if arguments are equal, false otherwise
 * @type Boolean
 */
function isDeepEqual(value1, value2) {
    if (value1 === value2) {
        return true;
    } else if (value1 instanceof Date && value2 instanceof Date) {
        return value1.getTime() === value2.getTime();
    } else if (typeof(value1) != "object" || typeof(value2) != "object") {
        return value1 == value2;
    } else {
        return objectsAreEqual(value1, value2);
    }
}

/**
 * Returns true if the objects passed as argument are equal
 * @param {Object} value1 The object to be compared
 * @param {Object} value2 The object to be compared to
 * @returns True if the objects are equal, false otherwise
 * @type Boolean
 */
function objectsAreEqual(obj1, obj2) {
    if (isNullOrUndefined(obj1) || isNullOrUndefined(obj2)) {
        return false;
    }
    // the 1.0 spec (and Unittest/B) speaks of comparing the prototype
    // property, which is only set for constructor functions (for instances
    // it's undefined). plus only owned properties are compared, leading
    // to two objects being equivalent even if their prototypes have
    // different properties. instead using Object.getPrototypeOf()
    // to compare the prototypes of two objects
    // see also http://groups.google.com/group/commonjs/msg/501a7e3cd9a920e5
    if (Object.getPrototypeOf(obj1) !== Object.getPrototypeOf(obj2)) {
        return false;
    }
    // compare object keys (objects *and* arrays)
    var keys1 = getOwnKeys(obj1);
    var keys2 = getOwnKeys(obj2);
    var propsAreEqual = keys1.length === keys2.length && keys1.every(function(name, idx) {
        return name === keys2[idx] && isDeepEqual(obj1[name], obj2[name]);
    });
    if (propsAreEqual === false) {
        return propsAreEqual;
    }
    // array comparison
    if (getType(obj1) === "array") {
        return obj1.length === obj2.length && obj1.every(function(value, idx) {
            return isDeepEqual(value, obj2[idx]);
        });
    }
    return true;
}

/**
 * Returns true if the argument is null or undefined
 * @param {Object} obj The object to test
 * @returns True if the argument is null or undefined
 * @type Boolean
 */
function isNullOrUndefined(obj) {
    return obj === null || obj === undefined;
}

/**
 * Returns the names of owned properties of the object passed as argument.
 * Note that this only includes those properties for which hasOwnProperty
 * returns true
 * @param {Object} obj The object to return its propery names for
 * @returns The property names
 * @type Array
 */
function getOwnKeys(obj) {
    return [key for (key in obj) if (Object.prototype.hasOwnProperty.call(obj, key))].sort();
}

/**
 * Basic failure method. Fails an assertion without checking any preconditions.
 *
 * @param {Object|String} options An object containing optional "message", "actual"
 * and "expected" properties, or alternatively a message string
 * @throws AssertionError
 * @example // a complex condition
 * if (a === true && (b === "complex" || ...)) {
 *   assert.fail("This should not be reached!");
 * }
 */
function fail(options) {
    throw new AssertionError(options);
}

/**
 * Prepends the comment to the message, if given
 * @returns The message
 * @type String
 */
function prependComment(message, comment) {
    if (getType(comment) === "string" && comment.length > 0) {
        return comment + "\n" + message;
    }
    return message;
}


/***************************
 *****   E R R O R S   *****
 ***************************/



/**
 * Constructs a new AssertionError instance
 * @class Instances of this class represent an assertion error
 * @param {Object} options An object containing error details
 * @param.message {String} The error message
 * @param.actual {Object} The actual value
 * @param.expected {Object} The expected value
 * @constructor
 * @augments Error
 */
function AssertionError(options) {
    // accept a single string argument
    if (getType(options) === "string") {
        options = {
            "message": options
        };
    }
    var stackTrace = getStackTrace();

    Object.defineProperty(this, "name", {
        get: function() {
            return "AssertionError";
        }
    });

    Object.defineProperty(this, "message", {
        get: function() {
            return options.message;
        }
    });

    Object.defineProperty(this, "actual", {
        get: function() {
            return options.actual;
        }
    });

    Object.defineProperty(this, "expected", {
        get: function() {
            return options.expected;
        }
    });

    Object.defineProperty(this, "stackTrace", {
        get: function() {
            return stackTrace;
        }
    });

    return this;
};

/** @ignore */
AssertionError.prototype = new Error();

/** @ignore */
AssertionError.toString = function() {
    return "[AssertionError]";
};

/** @ignore */
AssertionError.prototype.toString = function() {
    return "[AssertionError '" + this.message + "']";
};

/**
 * Creates a new ArgumentsError instance
 * @class Instances of this class represent an error thrown if insufficient
 * arguments have been passed to an assertion function
 * @param {String} message The exception message
 * @returns A newly created ArgumentsError instance
 * @constructor
 */
function ArgumentsError(message) {

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

/** @ignore */
ArgumentsError.prototype = new Error();

/** @ignore */
ArgumentsError.toString = function() {
    return "[ArgumentsError]";
};

/** @ignore */
ArgumentsError.prototype.toString = function() {
    return "[ArgumentsError '" + this.message + "']";
};




/*******************************************************************
 *****   C O M M O N J S   A S S E R T I O N   M E T H O D S   *****
 *******************************************************************/



/**
 * Checks if the value passed as argument is truthy.
 *
 * @example // passing assertions
 * assert.ok(true);
 * assert.ok("1");
 * assert.ok([]);
 * assert.ok({});
 * assert.ok(new Boolean(false));
 * assert.ok(Infinity);<br>
 * // failing assertions
 * assert.ok(0);
 * assert.ok(false);
 * assert.ok(null);
 * assert.ok(undefined);
 * assert.ok("");
 *
 * @param {Object} value The value to check for truthiness
 * @throws ArgumentsError
 * @throws AssertionError
 */
function ok(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (!!value === false) {
        fail({
            "message": prependComment("Expected " + jsDump(value) + " to be truthy", comment),
            "actual": value,
            "expected": true
        });
    }
    return;
}

/**
 * Performs a non-strict comparison with the simple comparison operator
 * <code>==</code> to check if the values are equal. When they are equal,
 * the assertion passes, otherwise it fails.
 *
 * @example // truthy conditionals
 * assert.equal(true, true);
 * assert.equal(true, "1");<br>
 * // falsy conditionals
 * assert.equal(false, false);
 * assert.equal(false, "");
 * assert.equal(false, "0");
 * assert.equal(null, undefined);
 *
 * @param {Object} actual The actual value
 * @param {Object} expected The expected value
 * @throws ArgumentsError
 * @throws AssertionError
 */
function equal(actual, expected) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (actual != expected) {
        fail({
            "message": prependComment("Expected " + jsDump(expected) + ", got " + jsDump(actual), comment),
            "actual": actual,
            "expected": expected
        });
    }
    return;
}

/**
 * Performs a non-strict comparison with the simple comparison operator
 * <code>!=</code> to check if the values are not equal.
 * When they are not equal, the assertion passes, otherwise it fails.
 *
 * @example // passing assertions
 * assert.notEqual(true, false);
 * assert.notEqual(1, 2);
 * assert.notEqual(false, NaN);
 * assert.notEqual(null, NaN);
 * assert.notEqual(undefined, NaN);
 *
 * @param {Object} actual The actual value
 * @param {Object} expected The expected value
 * @throws ArgumentsError
 * @throws AssertionError
 */
function notEqual(actual, expected) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (actual == expected) {
        fail({
            "message": prependComment("Expected different value than " + jsDump(expected) +
                       ", got equivalent value " + jsDump(actual), comment),
            "actual": actual,
            "expected": expected
        });
    }
    return;
}

/**
 * Performs a deep recursive comparison of objects. It is equivalent to
 * <code>equal()</code>. If an object's property holds a non-object type,
 * it performs a non-strict comparison. Instances of <code>Date</code> are
 * compared with <code>getTime()</code> according to universal time.
 *
 * @example // passing assertions
 * assert.deepEqual(5, "5");
 * assert.deepEqual(
 *   { time: new Date(2010, 5, 14) },
 *   { "time": new Date(2010, 5, 14) }
 * );
 * assert.deepEqual([1, 2, 3], ["1", "2", "3"]);
 * assert.deepEqual({"one": 1, "two": 2}, {"two": "2", "one": "1"});
 *
 * @param {Object} actual The actual value
 * @param {Object} expected The expected value
 * @throws ArgumentsError
 * @throws AssertionError
 */
function deepEqual(actual, expected) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (isDeepEqual(actual, expected) === false) {
        fail({
            "message": prependComment("Expected " + jsDump(expected) + ", got " + jsDump(actual), comment),
            "actual": actual,
            "expected": expected
        });
    }
    return;
}

/**
 * Performs a deep recursive comparison of objects. The comparison
 * is equivalent to <code>notEqual()</code>.
 *
 * @example // passing assertions
 * assert.notDeepEqual(
 *   { "time": new Date(2010, 5, 14) },
 *   { "time": new Date(2010, 5, 15) }
 * );
 * assert.notDeepEqual([1, 2, 3, 4], ["1", "2", "3"]);
 * assert.notDeepEqual({"one": 1, "two": 2}, {"three": "3", "one": "1"});
 *
 * @param {Object} actual The actual value
 * @param {Object} expected The expected value
 * @throws ArgumentsError
 * @throws AssertionError
 */
function notDeepEqual(actual, expected) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (isDeepEqual(actual, expected) === true) {
        fail({
            "message": prependComment("Expected different value than " + jsDump(expected) +
                       ", got deep equal value " + jsDump(actual), comment),
            "actual": actual,
            "expected": expected
        });
    }
    return;
}

/**
 * Performs a strict comparison with the strict equality operator <code>===</code>.
 * When the values are equal in type and value, the assertion passes,
 * otherwise it fails.
 *
 * @example // passing assertions
 * assert.strictEqual(null, null);
 * assert.strictEqual(undefined, undefined);
 * assert.strictEqual(1, 1);
 * assert.strictEqual("1", "1");
 * assert.strictEqual(true, true);<br>
 * // passing assertion
 * var obj = {};
 * assert.strictEqual(obj, obj);<br>
 * // failing assertions
 * assert.strictEqual(null, undefined);
 * assert.strictEqual(true, "1");
 * assert.strictEqual(false, "");
 * assert.strictEqual(false, "0");
 *
 * @param {Object} actual The actual value
 * @param {Object} expected The expected value
 * @throws ArgumentsError
 * @throws AssertionError
 */
function strictEqual(actual, expected) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (actual !== expected) {
        fail({
            "message": prependComment("Expected " + jsDump(expected) + ", got " + jsDump(actual), comment),
            "actual": actual,
            "expected": expected
        });
    }
    return;
}

/**
 * Performs a strict comparison with the strict inequality operator <code>!==</code>.
 * When the values are inequal in type and value, the assertion passes,
 * otherwise it fails.
 *
 * @example // passing assertions
 * assert.notStrictEqual(null, undefined);
 * assert.notStrictEqual(1, "1");
 * assert.notStrictEqual(true, false);
 *
 * @param {Object} actual The actual value
 * @param {Object} expected The expected value
 * @throws ArgumentsError
 * @throws AssertionError
 */
function notStrictEqual(actual, expected) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (actual === expected) {
        fail({
            "message": prependComment("Expected different value than " + jsDump(expected) +
                       ", got strictly equal value " + jsDump(actual), comment),
            "actual": actual,
            "expected": expected
        });
    }
    return;
}

/**
 * Checks if the function passed as argument throws a defined exception.
 * It can also assert certain Java exceptions thrown by the function.
 *
 * @example var foo = function() { throw "foo"; };
 * var bar = function() { (new java.util.Vector()).get(0); }<br>
 * // passes
 * assert.throws(foo, "foo");<br>
 * // fails
 * assert.throws(foo, "bar");<br>
 * // checks for a Java runtime exception, passes
 * assert.throws(bar, java.lang.ArrayIndexOutOfBoundsException);
 *
 * @param {Object} func The function to call
 * @param {Object} expectedError Optional object expected to be thrown when executing
 * the function
 * @throws ArgumentsError
 * @throws AssertionError
 */
function throws(func, expectedError) {
    if (!(func instanceof Function)) {
        throw new ArgumentsError("First argument to throws() must be a function");
    }
    try {
        func();
    } catch (e) {
        var isExpected = false;
        var thrown = e;
        if (expectedError == null) {
            // accept everything
            isExpected = true;
        } else if (expectedError != null && e != null) {
            // check if exception is the one expected
            switch (typeof(expectedError)) {
                case "string":
                    isExpected = (e.name === expectedError || e === expectedError);
                    break;
                case "function":
                    // this is true for all JS constructors and Java classes!
                    isExpected = (e instanceof expectedError ||
                                      (thrown = e.rhinoException) instanceof expectedError ||
                                      (thrown = e.javaException) instanceof expectedError);
                    break;
                case "number":
                case "boolean":
                default:
                    isExpected = (e === expectedError);
                    break;
            }
        }
        if (!isExpected) {
            fail({
                "message": "Expected " + jsDump(expectedError) +
                           " to be thrown, but got " + jsDump(e) + " instead",
                "actual": e,
                "expected": expectedError
            });
        }
        return;
    }
    if (expectedError != null) {
        fail("Expected exception " + jsDump(expectedError) + " to be thrown");
    }
    fail("Expected exception to be thrown");
}



/***************************************************************
 *****   C U S T O M   A S S E R T I O N   M E T H O D S   *****
 ***************************************************************/



/**
 * Checks if the value passed as argument is boolean true using <code>===</code>.
 *
 * @example // passing assertion
 * assert.isTrue(100 == 100);<br>
 * // failing assertion
 * assert.isTrue(100 != 100);
 *
 * @param {Object} val The value that should be boolean true.
 * @throws ArgumentsError
 * @throws AssertionError
 */
function isTrue(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (getType(value) !== "boolean") {
        throw new ArgumentsError("Invalid argument to assertTrue(boolean): " +
                jsDump(value));
    } else if (value !== true) {
        fail({
            "message": prependComment("Expected true, got " + jsDump(value), comment),
            "actual": value,
            "expected": true
        });
    }
    return;
}

/**
 * Checks if the value passed as argument is strict boolean false using <code>===</code>.
 *
 * @example // passing assertion
 * assert.isFalse(100 != 100);<br>
 * // failing assertion
 * assert.isFalse(100 == 100);
 *
 * @param {Object} val The value that should be boolean false.
 * @throws ArgumentsError
 * @throws AssertionError
 */
function isFalse(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (getType(value) !== "boolean") {
        throw new ArgumentsError("Invalid argument to assertFalse(boolean): " +
                             jsDump(value));
    } else if (value === true) {
        fail({
            "message": prependComment("Expected false, got " + jsDump(value), comment),
            "actual": value,
            "expected": false
        });
    }
    return;
}

/**
 * Checks if the value passed as argument is strict null using <code>===</code>.
 *
 * @example // passing assertion
 * assert.isNull(null);<br>
 * // failing assertions
 * assert.isNull(undefined);
 * assert.isNull("");
 *
 * @param {Object} val The value that should be null.
 * @throws ArgumentsError
 * @throws AssertionError
 */
function isNull(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (value !== null) {
        fail({
            "message": prependComment("Expected " + jsDump(value) + " to be null", comment),
            "actual": value,
            "expected": null
        });
    }
    return;
}

/**
 * Checks if the value passed as argument is strict not null using <code>===</code>.
 *
 * @example // passing assertions
 * assert.isNotNull(undefined);
 * assert.isNotNull("passes");<br>
 * // failing assertion
 * assert.isNotNull(null);
 *
 * @param {Object} val The value that should be not null.
 * @throws ArgumentsError
 * @throws AssertionError
 */
function isNotNull(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (value === null) {
        fail({
            "message": prependComment("Expected " + jsDump(value) + " to be not null", comment),
            "actual": value,
        });
    }
    return;
}

/**
 * Checks if the value passed as argument is strict undefined using <code>===</code>.
 *
 * @example // passing assertion
 * assert.isUndefined(undefined);<br>
 * // failing assertions
 * assert.isUndefined(null);
 * assert.isUndefined("");
 *
 * @param {Object} val The value that should be undefined.
 * @throws ArgumentsError
 * @throws AssertionError
 */
function isUndefined(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (value !== undefined) {
        fail({
            "message": prependComment("Expected " + jsDump(value) + " to be undefined", comment),
            "actual": value,
            "expected": undefined
        });
    }
    return;
}

/**
 * Checks if the value passed as argument is not undefined using <code>===</code>.
 *
 * @example // passing assertions
 * assert.isNotUndefined(null);
 * assert.isNotUndefined("passes");<br>
 * // failing assertion
 * assert.isNotUndefined(undefined);
 *
 * @param {Object} val The value that should be not undefined.
 * @throws ArgumentsError
 * @throws AssertionError
 */
function isNotUndefined(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (value === undefined) {
        fail({
            "message": prependComment("Expected argument to be not undefined", comment),
            "actual": value,
        });
    }
    return;
}

/**
 * Asserts that the value passed as argument is NaN.
 * Uses <code>global.isNaN()</code> for the check.
 * @param {Object} val The value that should be NaN.
 * @throws ArgumentsError
 * @throws AssertionError
 */
function isNaN(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (global.isNaN(value) === false) {
        fail({
            "message": prependComment("Expected " + jsDump(value) + " to be NaN", comment),
            "actual": value,
            "expected": NaN
        });
    }
    return;
}

/**
 * Checks if the value passed as argument is not NaN.
 * Uses <code>global.isNaN()</code> for the check.
 * @param {Object} val The value that should be not NaN.
 * @throws ArgumentsError
 * @throws AssertionError
 */
function isNotNaN(value) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (global.isNaN(value) === true) {
        fail({
            "message": prependComment("Expected " + jsDump(value) + " to be a number", comment),
            "actual": value,
            "expected": Number
        });
    }
    return;
}

/**
 * Checks if the value passed as argument contains the pattern specified.
 *
 * @example assert.stringContains("this will pass", "pass");
 * assert.stringContains("this will fail", "pass");
 *
 * @param {String} value The string that should contain the pattern
 * @param {String} pattern The string that should be contained
 * @throws ArgumentsError
 * @throws AssertionError
 */
function stringContains(value, pattern) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (getType(pattern) === "string") {
        if (value.indexOf(pattern) < 0) {
            fail(prependComment("Expected string " + jsDump(pattern) +
                    " to be found in " + jsDump(value), comment));
        }
    } else {
        throw new ArgumentsError("Invalid argument to assertStringContains(string, string):\n" +
                             jsDump(pattern));
    }
    return;
}

/**
 * Checks if the regular expression matches the string.
 *
 * @example assert.matches("this will pass", /p.?[s]{2}/);
 * assert.matches("this will fail", /[0-9]+/);
 *
 * @param {String} value The string that should contain the regular expression pattern
 * @param {RegExp} expr The regular expression that should match the value
 * @throws ArgumentsError
 * @throws AssertionError
 */
function matches(value, expr) {
    var comment = evalArguments(arguments, arguments.callee.length);
    if (getType(expr) === "regexp") {
        if (expr.test(value) == false) {
            fail(prependComment("Expected pattern " + jsDump(expr) + " to match " +
                    jsDump(value), comment));
        }
    } else {
        throw new ArgumentsError("Invalid argument to assertMatch(string, regexp):\n" +
                             jsDump(expr));
    }
    return;
}
