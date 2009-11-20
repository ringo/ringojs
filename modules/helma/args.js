/**
 * @fileoverview A parser for command line options.
 */

require("core/array");
require("core/string");

/**
 * Create a new command line option parser.
 */
exports.Parser = function() {
    var options = [];

    /**
     * Add an option to the parser.
     * @param shortName the short option name (without leading hyphen)
     * @param longName the long option name (without leading hyphens)
     * @param argument the name of the argument if the option requires one, or null
     * @param helpText the help text to display for the option
     */
    this.addOption = function(shortName, longName, argument, helpText) {
        if (shortName && shortName.length != 1) {
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
    };

    /**
     * Get help text for the parser's options suitable for display in command line scripts.
     */
    this.help = function() {
        var lines = [];
        for each (var opt in options) {
            var flags = " -" + opt.shortName;
            if (opt.longName) {
                flags += " --" + opt.longName;
            }
            if (opt.argument) {
                flags += " " + opt.argument;
            }
            lines.push({flags: flags, helpText: opt.helpText});
        }
        var maxlength = lines.reduce(function(prev, val) Math.max(val.flags.length, prev), 0);
        return lines.map(
            function(s) s.flags.pad(" ", 2 + maxlength) + s.helpText
        ).join("\n");
    };

    /**
     * Parse an arguments array into an option object.
     * @param args the argument array. Matching options are removed.
     * @param result optional result object. If undefined, a new Object is created
     * @returns the result object
     */
    this.parse = function(args, result) {
        result = result || {};
        while (args.length > 0) {
            var option = args[0];
            if (!option.startsWith("-")) {
                break;
            }
            if (option.startsWith("--")) {
                parseLongOption(option.substring(2), args, result);
            } else {
                parseShortOption(option.substring(1), args, result);
            }
        }
        return result;
    };

    function parseShortOption(opt, args, result) {
        var length = opt.length;
        var consumedNext = false;
        for (var i = 0; i < length; i++) {
            var def = null;
            var c = opt.charAt(i);
            for each (var d in options) {
                if (d.shortName == c) {
                    def = d;
                    break;
                }
            }
            if (def == null) {
                unknownOptionError("-" + c);
            }
            var optarg = null;
            if (def.argument) {
                if (i == length - 1) {
                    if (args.length <= 1) {
                        missingValueError("-" + def.shortName);
                    }
                    optarg = args[1];
                    consumedNext = true;
                } else {
                    optarg = opt.substring(i + 1);
                    if (optarg.length == 0) {
                        missingValueError("-" + def.shortName);
                    }
                }
                i = length;
            }
            result[def.longName || def.shortName] = optarg || true;
        }
        args.splice(0, consumedNext ? 2 : 1);
    }

    function parseLongOption(opt, args, result) {
        var def = null;
        for each (var d in options) {
            if (opt == d.longName || (opt.startsWith(d.longName)
                    && opt.charAt(d.longName.length) == '=')) {
                def = d;
                break;
            }
        }
        if (def == null) {
            unknownOptionError("--" + opt);
        }
        var optarg = null;
        var consumedNext = false;
        if (def.argument) {
            if (opt == def.longName) {
                if (args.length <= 1) {
                    missingValueError("--" + def.longName);
                }
                optarg = args[1];
                consumedNext = true;
            } else {
                var length = def.longName.length;
                if (opt.charAt(length) != '=') {
                    missingValueError("--" + def.longName);
                }
                optarg = opt.substring(length + 1);
            }
        }
        result[def.longName] = optarg || true;
        args.splice(0, consumedNext ? 2 : 1);
    }
};

function missingValueError(option) {
    throw new Error(option + " option requires a value.", -1);
}


function unknownOptionError(option) {
    throw new Error("Unknown option: " + option, -1);
}
