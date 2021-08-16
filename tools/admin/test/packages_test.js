const system = require("system");
const assert = require("assert");
const fs = require("fs");

const files = require("../utils/files");
const packages = require("../utils/packages");

exports.testGetDescriptor = () => {
    const tempDirectory = files.createTempDirectory();
    try {
        assert.isNull(packages.getDescriptor(tempDirectory));
        const packageJson = {dependencies: {}};
        fs.write(fs.join(tempDirectory, packages.PACKAGE_JSON), JSON.stringify(packageJson));
        assert.deepEqual(packages.getDescriptor(tempDirectory), packageJson);
        assert.isNull(packages.getDescriptor(tempDirectory, "nonexisting"));
        fs.write(fs.join(tempDirectory, "custom.json"), JSON.stringify(packageJson));
        assert.deepEqual(packages.getDescriptor(tempDirectory, "custom.json"), packageJson);
    } finally {
        tempDirectory && fs.removeTree(tempDirectory);
    }
};

exports.testSave = () => {
    const dependencies = [
        {name: "two", url: "https://example.com/archive-2.tgz"},
        {name: "one", url: "https://example.com/archive-1.tgz"}
    ];
    const tempDirectory = files.createTempDirectory();
    try {
        assert.isFalse(fs.exists(fs.join(tempDirectory, packages.PACKAGE_JSON)));
        let packageJsonPath = packages.save(tempDirectory, dependencies);
        assert.isTrue(fs.isFile(packageJsonPath));
        let packageJson = JSON.parse(fs.read(packageJsonPath));
        assert.isTrue(packageJson.hasOwnProperty("dependencies"));
        // dependencies are sorted by name
        assert.strictEqual(Object.keys(packageJson.dependencies).length, dependencies.length);
        assert.deepEqual(Object.keys(packageJson.dependencies), dependencies.map(dep => dep.name).sort());
        dependencies.forEach(dep => {
            assert.strictEqual(packageJson.dependencies[dep.name], dep.url);
        });
        // add another dependency
        const added = {name: "last", url: "git://example.com/owner/repo"};
        packageJsonPath = packages.save(tempDirectory, [added]);
        packageJson = JSON.parse(fs.read(packageJsonPath));
        assert.strictEqual(Object.keys(packageJson.dependencies).length, 3);
        assert.isTrue(Object.keys(packageJson.dependencies).includes(added.name));
        assert.strictEqual(packageJson.dependencies[added.name], added.url);
        assert.deepEqual(Object.keys(packageJson.dependencies), ["last", "one", "two"]);
    } finally {
        tempDirectory && fs.removeTree(tempDirectory);
    }
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
