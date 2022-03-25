const system = require("system");
const assert = require("assert");
const archive = require("../utils/archive");
const fs = require("fs");

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

exports.testGetEntries = () => {
    ARCHIVES_WITH_BASEPATH.forEach(path => {
        const inputStream = archive.newArchiveInputStream(path);
        const entries = archive.getEntries(inputStream);
        assert.deepEqual(entries.sort(), [
            "package/",
            "package/lib/",
            "package/README.txt",
            "package/lib/test/",
            "package/lib/main.js",
            "package/lib/test/test.js"
        ].sort(), path);
        // inputStream is closed by getEntries(), but for some reason
        // it still returns null?
        assert.isNull(inputStream.getNextEntry(), path);
    });
    ARCHIVES.forEach(path => {
        const inputStream = archive.newArchiveInputStream(path);
        const entries = archive.getEntries(inputStream);
        assert.deepEqual(entries.sort(), [
            "lib/",
            "README.txt",
            "lib/test/",
            "lib/main.js",
            "lib/test/test.js"
        ].sort(), path);
    });
};

exports.testExtract = () => {
    const entries = [
        "",
        "lib",
        "README.txt",
        "lib/test",
        "lib/main.js",
        "lib/test/test.js"
    ].sort();

    [ARCHIVES_WITH_BASEPATH, ARCHIVES].forEach(paths => {
        paths.forEach(path => {
            let directory;
            try {
                directory = archive.extract(path);
                assert.deepEqual(fs.listTree(directory), entries, path);
            } finally {
                directory && fs.removeTree(directory);
            }
        });
    });
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
