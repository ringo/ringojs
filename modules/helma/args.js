var options = [
    ["b", "bootscript", "Run additional bootstrap script", "FILE"],
    ["d", "debug", "Run with debugger GUI", ""],
    ["e", "expression", "Run the given expression as script", "EXPR"],
    ["h", "help", "Display this help message", ""],
    ["H", "history", "Use custom history file (default: ~/.helma-history)", "FILE"],
    ["i", "interactive", "Start shell after script file has run", ""],
    ["o", "optlevel", "Set Rhino optimization level (-1 to 9)", "OPT"],
    ["p", "policy", "Set java policy file and enable security manager", "URL"],
    ["s", "silent", "Disable shell prompt and echo for piped stdin/stdout", ""],
    ["V", "verbose", "Verbose mode: print Java stack traces", ""],
    ["v", "version", "Print version number and exit", ""]
];

require("core/string");

export("parseOptions");

function parseOptions(args) {
    var i;
    for (i = 0; i < args.length; i++) {
        var option = args[i];
        if (!option.startsWith("-")) {
            break;
        }
        var nextArg = i < args.length - 1 ? args[i + 1] : null;
        var result;
        if (option.startsWith("--")) {
            result = parseLongOption(option.substring(2), nextArg);
        } else {
            result = parseShortOption(option.substring(1), nextArg);
        }
        if (result < 0) {
            break;
        } else {
            i += result;
        }
    }
    return i;
}

function parseShortOption(opt, nextArg) {
    var length = opt.length;
    for (var i = 0; i < length; i++) {
        var def = null;
        var c = opt.charAt(i);
        for each (var d in options) {
            if (d[0] == c) {
                def = d;
                break;
            }
        }
        if (def == null) {
            unknownOptionError("-" + c);
        }
        var optarg = null;
        var consumedNext = 0;
        if (def[3]) {
            if (i == length - 1) {
                if (nextArg == null) {
                    missingValueError("-" + def[0]);
                }
                optarg = nextArg;
                consumedNext = 1;
            } else {
                optarg = opt.substring(i + 1);
                if (optarg.length == 0) {
                    missingValueError("-" + def[0]);
                }
            }
            i = length;
        }
        processOption(def[1], optarg);
        if (i >= length) {
            return consumedNext;
        }
    }
    return 0;
}

function parseLongOption(opt, nextArg) {
    var def = null;
    for each (var d in options) {
        if (opt.equals(d[1]) || (opt.startsWith(d[1])
                             && opt.charAt(d[1].length) == '=')) {
            def = d;
            break;
        }
    }
    if (def == null) {
        unknownOptionError("--" + opt);
    }
    var optarg = null;
    var consumedNext = 0;
    if (def[3]) {
        if (opt.equals(def[1])) {
            if (nextArg == null) {
                missingValueError("--" + def[1]);
            }
            optarg = nextArg;
            consumedNext = 1;
        } else {
            var length = def[1].length;
            if (opt.charAt(length) != '=') {
                missingValueError("--" + def[1]);
            }
            optarg = opt.substring(length + 1);
        }
    }
    processOption(def[1], optarg);
    return consumedNext;
}

function processOption(opt, arg) {
    print("Option " + opt + " with arg " + arg);
}

function missingValueError(option) {
    throw new Error(option + " option requires a value.", -1);
    }

function rangeError(option) {
    throw new Error(option + " value must be a number between -1 and 9.", -1);
    }

function unknownOptionError(option) {
    throw new Error("Unknown option: " + option, -1);
}
