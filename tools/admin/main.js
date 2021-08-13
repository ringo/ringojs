const log = require("ringo/logging").getLogger(module.id);
const system = require("system");
const term = require("ringo/term");

const run = (args) => {
    const command = args.shift() || "help";
    try {
        const commandModule = require("./commands/" + command);
        commandModule.run(args);
    } catch (e if e instanceof InternalError) {
        log.error(e);
        term.writeln(term.RED, "Unknown command '" + command +
            "', use 'help' to get a list of available commands",
            term.RESET);
        return false;
    } catch (e) {
        term.writeln(term.RED, e.message, term.RESET);
    }
};

if (require.main == module) {
    // strip the module file path from args
    run(system.args.slice(1));
}
