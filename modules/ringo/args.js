/**
 * @fileoverview A parser for command line options. This parser supports
 * various option formats:
 *
 * <ul>
 *   <li><code>-a -b -c</code> (multiple short options)</li>
 *   <li><code>-abc</code> (multiple short options combined into one)</li>
 *   <li><code>-a value</code> (short option with value)</li>
 *   <li><code>-avalue</code> (alternative short option with value)</li>
 *   <li><code>--option value</code> (long option with value)</li>
 *   <li><code>--option=value</code> (alternative long option with value)</li>
 * </ul>
 *
 * @example // ringo parserExample.js -v --size 123 -p 45678
 *
 * const term = require('ringo/term');
 * const system = require('system');
 * const {Parser} = require('ringo/args');
 *
 * const parser = new Parser();
 * parser.addOption('s', 'size', 'SIZE', 'Sets the size to SIZE');
 * parser.addOption('p', 'pid', 'PID', 'Kill the process with the PID');
 * parser.addOption('v', 'verbose', null, 'Verbosely do something');
 * parser.addOption('h', 'help', null, 'Show help');
 *
 * const options = parser.parse(system.args.slice(1));
 * if (options.help) {
 *   term.writeln(parser.help());
 *} else {
 *   if (options.size) {
 *      term.writeln('Set size to ' + parseInt(options.size));
 *   }
 *
 *   if (options.pid) {
 *      term.writeln('Kill process ' + options.pid);
 *   }
 *
 *   if (options.verbose) {
 *      term.writeln('Verbose!');
 *   }
 *}
 *
 * if (!Object.keys(options).length) {
 *   term.writeln("Run with -h/--help to see available options");
 * }
 */

const strings = require("ringo/utils/strings");
const missingValueError = (option) => new Error(option + " option requires a value.");
const unknownOptionError = (option) => new Error("Unknown option: " + option);

const parseShortOption = (options, opt, args, result) => {
    const length = opt.length;
    let consumedNext = false;
    for (let i = 0; i < length; i++) {
        let def = null;
        let c = opt.charAt(i);
        for (let d of options) {
            if (d.shortName === c) {
                def = d;
                break;
            }
        }
        if (def == null) {
            throw unknownOptionError("-" + c);
        }
        let optarg = null;
        if (def.argument) {
            if (i === length - 1) {
                if (args.length <= 1) {
                    throw missingValueError("-" + def.shortName);
                }
                optarg = args[1];
                consumedNext = true;
            } else {
                optarg = opt.substring(i + 1);
                if (optarg.length === 0) {
                    throw missingValueError("-" + def.shortName);
                }
            }
            i = length;
        }
        let propertyName = def.longName || def.shortName;
        result[strings.toCamelCase(propertyName)] = optarg || true;
    }
    args.splice(0, consumedNext ? 2 : 1);
};

const parseLongOption = (options, opt, args, result) => {
    let def = null;
    for (let d of options) {
        if (opt === d.longName || (strings.startsWith(opt, d.longName)
            && opt.charAt(d.longName.length) === '=')) {
            def = d;
            break;
        }
    }
    if (def == null) {
        throw unknownOptionError("--" + opt);
    }
    let optarg = null;
    let consumedNext = false;
    if (def.argument) {
        if (opt === def.longName) {
            if (args.length <= 1) {
                throw missingValueError("--" + def.longName);
            }
            optarg = args[1];
            consumedNext = true;
        } else {
            const length = def.longName.length;
            if (opt.charAt(length) !== '=') {
                throw missingValueError("--" + def.longName);
            }
            optarg = opt.substring(length + 1);
        }
    }
    result[strings.toCamelCase(def.longName)] = optarg || true;
    args.splice(0, consumedNext ? 2 : 1);
};

/**
 * Create a new command line option parser.
 */
exports.Parser = function() {
    const options = [];

    /**
     * Add an option to the parser.
     * @param {String} shortName the short option name (without leading hyphen)
     * @param {String} longName the long option name (without leading hyphens)
     * @param {String} argument display name of the option's value, or null if the argument is a singular switch
     * @param {String} helpText the help text to display for the option
     * @returns {Object} this parser for chained invocation
     */
    this.addOption = function(shortName, longName, argument, helpText) {
        if (typeof(shortName) !== "string" || shortName.length !== 1) {
            throw new Error("Short option must be a string of length 1");
        }
        longName = longName || "";
        argument = argument || "";
        options.push({
            shortName: shortName,
            longName: longName,
            argument: argument,
            helpText: helpText
        });
        return this;
    };

    /**
     * Get help text for the parser's options suitable for display in command line scripts.
     * @returns {String} a string explaining the parser's options
     */
    this.help = function() {
        const lines = options.reduce((lines, opt) => {
            let flags;
            if (opt.shortName !== undefined && opt.shortName !== null) {
                flags = " -" + opt.shortName;
            } else {
                flags = "   ";
            }
            if (opt.longName) {
                flags += " --" + opt.longName;
            }
            if (opt.argument) {
                flags += " " + opt.argument;
            }
            lines.push({flags: flags, helpText: opt.helpText});
            return lines;
        }, []);
        const maxlength = lines.reduce((prev, val) => Math.max(val.flags.length, prev), 0);
        return lines.map(s => {
            return strings.pad(s.flags, " ", 2 + maxlength) + s.helpText;
        }).join("\n");
    };

    /**
     * Parse an arguments array into an option object. If a long option name is defined,
     * it is converted to camel-case and used as property name. Otherwise, the short option
     * name is used as property name.
     *
     * Passing an result object as second argument is a convenient way to define default
     * options:
     * @param {Array} args the argument array. Matching options are removed.
     * @param {Object} result optional result object. If undefined, a new Object is created.
     * @returns {Object} the result object
     * @see <a href="../../ringo/utils/strings/index.html#toCamelCase">toCamelCase()</a>
     * @example parser.parse(system.args.slice(1), {myOption: "defaultValue"});
     */
    this.parse = function(args, result) {
        result || (result = {});
        while (args.length > 0) {
            let option = args[0];
            if (!strings.startsWith(option, "-")) {
                break;
            }
            if (strings.startsWith(option, "--")) {
                parseLongOption(options, option.substring(2), args, result);
            } else {
                parseShortOption(options, option.substring(1), args, result);
            }
        }
        return result;
    };

    return this;
};
