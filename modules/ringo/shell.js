/**
 * @fileOverview Provides functions to deal with the Ringo shell / REPL.
 * It allows to start a new Ringo shell programmatically.
 * This module is internally used by every Ringo REPL to interact with the user.
 * The example shows a simple Ringo shell script which prepares an object and
 * opens a shell for live interaction.
 *
 * @example #!/usr/bin/env ringo
 * if (require.main == module) {
 *   const obj = { 'foo': 'bar' };
 *   require('ringo/shell').start();
 * }
 *
 * // running the script opens a new shell
 * // with the prepared object available
 * >> console.dir(obj);
 * { foo: 'bar' }
 */

const system = require('system');
const term = require('ringo/term');
const {Character} = java.lang;

const styles = {
    'number': term.BLUE,
    'string': term.GREEN,
    'function': term.CYAN,
    'boolean': term.YELLOW,
    'null': term.BOLD,
    'date': term.MAGENTA,
    'java': term.MAGENTA,
    'custom': term.RED
};

let input = null;
try {
    input = new Packages.jline.console.ConsoleReader();
} catch (x) {
    // fall back to plain standard input
}

/**
 * Write 0..n arguments to standard output.
 * @param {*...} args...
 */
const write = exports.write = function() {
    const length = arguments.length;
    const out = system.stdout;
    for (let i = 0; i < length; i++) {
        out.write(String(arguments[i]));
        if (i < length - 1) {
            out.write(' ');
        }
    }
};

/**
 * Write 0..n arguments to standard output, followed by a newline.
 * @param {*...} args...
 */
exports.writeln = function() {
    write.apply(this, arguments);
    system.stdout.writeLine('');
};

/**
 * Read a single character from the standard input.
 */
exports.read = () => {
    if (!input) {
        throw new Error('jline not installed');
    }
    return String.fromCharCode(input.readVirtualKey());
};

/**
 * Read a single line from the standard input.
 * @param {String} prompt optional prompt to display
 * @param {String} echoChar character to use as echo,
 *         e.g. '*' for passwords or '' for no echo.
 */
exports.readln = (prompt, echoChar) => {
    prompt || (prompt = '');
    if (input) {
        if (typeof echoChar === 'string') {
            const echo = new Character((echoChar === '') ? 0 : echoChar.charCodeAt(0));
            return input.readLine(prompt, echo);
        }
        return input.readLine(prompt);
    } else {
        system.stdout.write(prompt);
        return system.stdin.readLine().trim();
    }
};

/**
 * Start the shell programmatically. This uses the current thread and thus will not
 * return. You should therefore call this function as the last statement in your script.
 * Terminating the shell will exit the program.
 * @since 0.5
 * @param {RhinoEngine} engine
 */
exports.start = (engine) => {
    engine = engine || require('ringo/engine').getRhinoEngine();
    (new org.ringojs.tools.RingoShell(engine)).run();
};

/**
 * Quit the shell and exit the JVM.
 * @param {Number} status optional integer exit status code (default is 0)
 */
exports.quit = (status) => {
   java.lang.System.exit(status || 0);
};

const convert = (value, nesting, visited) => {
    const type = typeof value;
    let retval = {type: type};
    let count = 0;
    switch (type) {
        case 'number':
            retval.string = String(value);
            break;
        case 'string':
            retval.string  = "'" + value.replace(/'/g, "\\'") + "'";
            break;
        case 'function':
            retval.string = "[Function]";
            break;
        case 'boolean':
            retval.string =  String(value);
            break;
        case 'object':
            if (value === null) {
                retval.type = retval.string = 'null';
                break;
            }
            if (visited.indexOf(value) > -1) {
                retval.type = "cyclic";
                retval.string = "[CyclicRef]";
                break;
            }
            visited.push(value);
            if (value instanceof java.lang.Object && typeof value.getClass === "function") {
                retval.type = "java";
                retval.string = "[" + value.getClass().getName() + " "
                        + String(value) + "]";
            } else if (value instanceof Date) {
                retval.type = "date";
                retval.string = String(value);
            } else if (Array.isArray(value)) {
                if (nesting > 1) {
                    retval.string = "[...]";
                } else {
                    retval.type = "array";
                    retval.items = [];
                    for (let i = 0; i < value.length; i++) {
                        let part = convert(value[i], nesting + 1, visited);
                        count += (part.string && part.string.length || part.count || 0) + 2;
                        retval.items.push(part);
                    }
                    retval.count = count;
                }
            } else if (value.toString !== Object.prototype.toString) {
                // if object provides its own toString we assume it wants to use it
                retval.type = "custom";
                retval.string = value.toString();
                break;
            } else {
                if (nesting > 1) {
                    retval.string = "{...}";
                } else {
                    retval.items = [];
                    let keys = Object.keys(value);
                    count = 0;
                    for (let i = 0; i < keys.length; i++) {
                        let part = convert(value[keys[i]], nesting + 1, visited);
                        count += String(keys[i]).length + 4;
                        count += part.string && part.string.length || part.count || 0;
                        retval.items.push({
                            key: keys[i] + ": ",
                            value: part
                        });
                    }
                    retval.count = count;
                }
            }
            break;
        case 'undefined':
            retval = {};
            break;
        default:
            retval.string = String(value);
            break;
    }
    return retval;
};

/**
 * @param {Object} value
 * @param {Stream} writer
 */
const printResult = exports.printResult = (value, writer) => {
    if (typeof value !== "undefined") {
        writer = writer || term;
        printValue(convert(value, 0, []), writer, 0);
        writer.writeln();
    }
};

const printValue = (value, writer, nesting) => {
    if (value.string) {
        const style = styles[value.type] || "";
        writer.write(style + value.string + term.RESET);
    } else if (value && value.items) {
        const multiline = value.count > 60;
        const isArray = value.type === "array";
        const length = value.items.length;
        if (length === 0) {
            writer.write(isArray ? "[]" : "{}");
            return;
        }
        const opener = isArray ? "[" : "{";
        if (multiline && nesting > 0) {
            writer.write(opener + "\n  ");
            for (let j = 0; j < nesting; j++) {
                writer.write("  ");
            }
        } else {
            writer.write(opener + " ");
        }
        if (isArray) {
            for (let i = 0; i < length; i++) {
                printValue(value.items[i], writer, nesting + 1);
                if (i < length - 1) {
                    if (multiline) {
                        writer.write(",\n  ");
                        for (let j = 0; j < nesting; j++) {
                            writer.write("  ");
                        }
                    } else {
                        writer.write(", ");
                    }
                }
            }
            writer.write(term.RESET + " ]");
        } else {
            for (let i = 0; i < length; i++) {
                writer.write(value.items[i].key);
                printValue(value.items[i].value, writer, nesting + 1);
                if (i < length - 1) {
                    if (multiline) {
                        writer.write(",\n  ");
                        for (let j = 0; j < nesting; j++) {
                            writer.write("  ");
                        }
                    } else {
                        writer.write(", ");
                    }
                }
            }
            writer.write(term.RESET + " }");
        }
    }
};

/**
 * @param {Exception} xcept
 * @param {Array} errors
 * @param {Boolean} verbose
 */
const printError = exports.printError = (xcept, errors, verbose) => {
    if (xcept instanceof org.mozilla.javascript.RhinoException) {
        term.writeln(term.BOLD, term.RED, xcept.details());
    } else {
        term.writeln(term.BOLD, term.RED, xcept.toString());
    }
    errors.forEach(error => term.writeln(term.GREEN, error));
    if (typeof xcept.getScriptStackTrace === "function") {
        term.write(xcept.getScriptStackTrace());
    }
    if (verbose) {
        if (typeof xcept.getWrappedException === "function") {
            xcept = xcept.getWrappedException();
        }
        term.writeln(term.BOLD, "Java Exception:")
        xcept.printStackTrace(system.stdout.raw || System.out);
    }
};
