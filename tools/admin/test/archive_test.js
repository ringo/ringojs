const system = require("system");
const assert = require("assert");
const archive = require("../utils/archive");

const {Path} = java.nio.file;

const ARCHIVES = [
    module.resolve("./archives/package.tar"),
    module.resolve("./archives/package.tar.gz"),
    module.resolve("./archives/package.zip")
];

const ARCHIVES_WITH_BASEPATH = [
    module.resolve("./archives/package-basepath.tar"),
    module.resolve("./archives/package-basepath.tar.gz"),
    module.resolve("./archives/package-basepath.zip")
];

exports.testGetBasePath = () => {
    ARCHIVES_WITH_BASEPATH.forEach(path => {
        const basePath = archive.getBasePath(path);
        assert.isTrue(basePath instanceof Path, path);
        assert.strictEqual(basePath.toString(), "package", path);
    });
    ARCHIVES.forEach(path => {
        const basePath = archive.getBasePath(path);
        assert.isTrue(basePath instanceof Path, path);
        assert.strictEqual(basePath.toString(), "", path);
    });
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
