const strings = require("ringo/utils/strings");

const indent = (lvl) => strings.repeat("    ", lvl);
const quote = (str) => JSON.stringify(str.toString());

/**
 * Converts the value passed as argument into a nicely formatted and
 * indented string
 * @param {Object} value The value to convert into a string
 * @param {Number} lvl Optional indentation level (defaults to zero)
 * @returns {String} The string representation of the object passed as argument
 */
const jsDump = exports.jsDump = (value, lvl) => {
    if (!lvl) {
        lvl = 0;
    }
    let buf;
    switch (getType(value)) {
        case "string":
            return quote(value);
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
            buf = value.map(val => indent(lvl + 1) + jsDump(val, lvl + 1));
            return ["[", buf.join(",\n"), indent(lvl) + "]"].join("\n");
        case "object":
            buf = Object.keys(value).map(key => {
                return indent(lvl + 1) + '"' +
                    key + '": ' +
                    jsDump(value[key], lvl + 1);
            });
            return ["{", buf.join(",\n"), indent(lvl) + "}"].join("\n");
        case "java":
            return '<java:' + value.class.name + '>';
    }
};

/**
 * Returns the type of the object passed as argument.
 * @param {Object} obj
 * @returns {String} The type of the object passed as argument
 */
const getType = exports.getType = (obj) => {
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
};

/**
 * Creates a stack trace and parses it for display.
 * @param {java.lang.StackTraceElement} trace Optional stacktrace to parse.
 * If undefined a stacktrace will be generated
 * @returns {String} The parsed stack trace
 */
exports.getStackTrace = (trace) => {
    // create exception and fill in stack trace
    if (!trace) {
        const ex = new org.mozilla.javascript.EvaluatorException("");
        ex.fillInStackTrace();
        trace = ex.getScriptStack();
    }
    return trace.reduce((stack, el) => {
        if (el.fileName != null && el.lineNumber > -1) {
            // exclude all lines containing the unittest module itself
            if (!el.fileName.startsWith(module.id) &&
                    !el.fileName.startsWith("assert.js") &&
                    el.fileName !== "test.js") {
                stack.push("at " + el.fileName + ":" + el.lineNumber);
            }
        }
        return stack;
    }, []);
};
