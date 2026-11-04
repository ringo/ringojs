const system = require("system");
const assert = require("assert");
const fs = require("fs");

const install = require("../commands/install");
const files = require("../utils/files");
const git = require("../utils/git");

exports.testGetInstallDirectory = () => {
    const packagesDirectory = fs.absolute("packages");
    ["package", "..foo", "foo..bar"].forEach(name => {
        assert.strictEqual(String(files.getInstallDirectory(packagesDirectory, name)),
                fs.join(packagesDirectory, name));
    });
    [undefined, "", ".", "..", "../victim", "foo/bar", "..\\victim", "foo\0bar"].forEach(name => {
        assert.throws(() => files.getInstallDirectory(packagesDirectory, name), Error);
    });
};

exports.testInstallRejectsTraversal = () => {
    const root = files.createTempDirectory();
    const {clone} = git;
    try {
        const packagesDirectory = fs.join(root, "packages");
        const victim = fs.join(root, "victim");
        const source = fs.join(root, "source");
        [packagesDirectory, victim, source].forEach(path => fs.makeDirectory(path));
        fs.write(fs.join(source, "package.json"), JSON.stringify({name: "../victim"}));
        git.clone = () => source;
        assert.throws(() => install.installGit({}, packagesDirectory, {force: true}), Error);
        assert.isTrue(fs.exists(victim));
        assert.isFalse(fs.exists(source));
    } finally {
        git.clone = clone;
        fs.removeTree(root);
    }
};

// start the test runner if we're called directly from command line
if (require.main === module) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
