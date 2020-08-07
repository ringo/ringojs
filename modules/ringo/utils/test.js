var strings = require("ringo/utils/strings");

/**
 * Converts the value passed as argument into a nicely formatted and
 * indented string
 * @param {Object} value The value to convert into a string
 * @param {Number} lvl Optional indentation level (defaults to zero)
 * @returns The string representation of the object passed as argument
 * @type String
 */
const jsDump = exports.jsDump = function jsDump(value, lvl) {
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
            if (getType(value.name) === "string" && value.name.length > 0) {
                return value.name;
            }
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
        case "java":
            return '<java:' + value.class.name + '>';
    }
}
/**
 * @ignore
 */
jsDump.indent = function(lvl) {
    return strings.repeat("    ", lvl);
};

/**
 * @ignore
 */
jsDump.quote = function(str) {
    return JSON.stringify(str.toString());
};

/**
 * Returns the type of the object passed as argument.
 * @param {Object} obj
 * @returns The type of the object passed as argument
 * @type String
 */
const getType = exports.getType = function getType(obj) {
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
    } else if (obj instanceof java.lang.Object) {
        return "java";
    }
    return "object";
}

/**
 * Creates a stack trace and parses it for display.
 * @param {java.lang.StackTraceElement} trace The trace to parse. If not given
 * a stacktrace will be generated
 * @returns The parsed stack trace
 * @type String
 */
const getStackTrace = exports.getStackTrace = function getStackTrace(trace) {
    // create exception and fill in stack trace
    if (!trace) {
        var ex = new Packages.org.mozilla.javascript.EvaluatorException("");
        ex.fillInStackTrace();
        trace = ex.getScriptStack();
    }
    var stack = [];
    var el, fileName, lineNumber;
    for (var i = 0; i < trace.length; i += 1) {
        el = trace[i];
        if (el.fileName != null && el.lineNumber > -1) {
            // exclude all lines containing the unittest module itself
            // FIXME (ro): this is quite ugly, but it works ...
            if (el.fileName.indexOf(module.id) === 0 || el.fileName.indexOf("assert") === 0) {
                continue;
            }
            stack.push("at " + el.fileName + ":" + el.lineNumber);
        }
    }
    return stack;
};
