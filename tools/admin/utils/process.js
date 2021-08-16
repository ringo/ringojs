const log = require("ringo/logging").getLogger(module.id);
const {MemoryStream} = require("io");
const {ProcessBuilder} = java.lang;

exports.execute = (command) => {
    log.debug("Executing '{}'", command.join(" "));
    const processBuilder = new ProcessBuilder(command);
    const process = processBuilder.start();
    const output = new MemoryStream();
    const errput = new MemoryStream();
    const stdout = new Stream(process.getInputStream());
    const stderr = new Stream(process.getErrorStream());
    spawn(() => {
        try {
            stdout.copy(output);
        } catch (e) {
            /* ignore - this will be handled via exit code below */
        }
    }).get();
    spawn(() => {
        try {
            stderr.copy(errput);
        } catch (e) {
            /* ignore - this will be handled via exit code below */
        }
    }).get();
    const exitCode = process.waitFor();
    if (exitCode !== 0) {
        throw new Error("(" + exitCode + ") " + errput.content.decodeToString());
    }
    const errors = errput.content.decodeToString();
    if (errors.length > 0) {
        log.debug("Git errors while executing {}:", command, errors);
    }
    return output.content;
};
