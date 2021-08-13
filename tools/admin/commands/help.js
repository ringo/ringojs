const fs = require("fs");
const term = require("ringo/term");

exports.description = "Display available commands";

exports.run = ([name]) => {
    if (name != null) {
        try {
            require("./" + name).help();
        } catch (e if e instanceof InternalError) {
            term.writeln(term.RED, "Unknown command '" + name +
                    "', use 'help' to get a list of available commands",
                    term.RESET);
        }
    } else {
        // print short info about available modules
        term.writeln();
        term.writeln(term.GREEN, "Available commands:", term.RESET);
        fs.list(module.directory).sort().forEach(file => {
            const cmd = file.slice(0, fs.extension(file).length * -1);
            const {description} = require(module.resolve(file));
            term.writeln(term.BOLD, " ", cmd, term.RESET, "-", description || "(no description)");
        });
        term.writeln();
    }
};
