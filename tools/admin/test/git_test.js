const system = require("system");
const assert = require("assert");
const gitUtils = require("./utils/git");
const git = require("../utils/git");
const files = require("../utils/files");
const fs = require("fs");

const REPOSITORY = module.resolve("./repo/package-1").toString();
const URL = String("file://" + REPOSITORY);

exports.testGetRemoteRefs = () => {
    const refs = git.getRemoteRefs(URL);
    // it does not return "v1.0.0^{}" ref
    assert.deepEqual(refs, ["master", "v1.0", "v1.0.0"]);
};

exports.testFullClone = () => {
    const tests = [
        {treeish: undefined, expected: "master\n"},
        {treeish: "HEAD", expected: "master\n"},
        {treeish: "v1.0", expected: "v1.0\n"},
        {treeish: "b07478f4c7d4421", expected: "test\n"}
    ];
    tests.forEach(test => {
        const tempDirectory = files.createTempDirectory();
        try {
            git.fullClone(URL, tempDirectory, test.treeish);
            assert.isTrue(fs.list(tempDirectory).includes("test.txt"));
            assert.strictEqual(fs.read(fs.join(tempDirectory, "test.txt")), test.expected);
        } finally {
            tempDirectory && fs.removeTree(tempDirectory);
        }
    });
};

exports.testFullCloneFailure = () => {
    const treeish = [
        "nonexisting"
    ];
    treeish.forEach(value => {
        const tempDirectory = files.createTempDirectory();
        try {
            assert.throws(() => git.fullClone(URL, tempDirectory, value));
        } finally {
            tempDirectory && fs.removeTree(tempDirectory);
        }
    });
};

exports.testShallowClone = () => {
    const tests = [
        {treeish: "v1.0", expected: "v1.0\n"}, // branch
        {treeish: "v1.0.0", expected: "v1.0\n"} // tag
    ];
    tests.forEach(test => {
        const tempDirectory = files.createTempDirectory();
        try {
            git.shallowClone(URL, tempDirectory, test.treeish);
            assert.isTrue(fs.list(tempDirectory).includes("test.txt"));
            assert.strictEqual(fs.read(fs.join(tempDirectory, "test.txt")), test.expected);
        } finally {
            tempDirectory && fs.removeTree(tempDirectory);
        }
    });
};

exports.testShallowCloneFailure = () => {
    const treeish = [
        "HEAD",
        "nonexisting",
        "b07478f4c7d4421" // commit
    ];
    treeish.forEach(value => {
        const tempDirectory = files.createTempDirectory();
        try {
            assert.throws(() => git.shallowClone(URL, tempDirectory, value));
        } finally {
            tempDirectory && fs.removeTree(tempDirectory);
        }
    });
};

exports.testCheckout = () => {
    const positive = [
        {treeish: "HEAD", expected: "master\n"},
        {treeish: "v1.0", expected: "v1.0\n"},
        {treeish: "v1.0.0", expected: "v1.0\n"},
        {treeish: "b07478f4c7d4421", expected: "test\n"}
    ];
    const negative = [
        "nonexisting"
    ];
    const tempDirectory = files.createTempDirectory();
    try {
        git.fullClone(URL, tempDirectory);
        positive.forEach(test => {
            git.checkout(tempDirectory, test.treeish);
            assert.strictEqual(fs.read(fs.join(tempDirectory, "test.txt")), test.expected);
        });
        negative.forEach(treeish => {
            assert.throws(() => git.checkout(tempDirectory, treeish));
        });
    } finally {
        tempDirectory && fs.removeTree(tempDirectory);
    }
};

exports.testInstall = () => {
    const tempSourceDirectory = files.createTempDirectory();
    const tempDestinationDirectory = files.createTempDirectory();
    try {
        git.fullClone(URL, tempSourceDirectory);
        git.install(tempSourceDirectory, tempDestinationDirectory);
        const fileList = fs.list(tempDestinationDirectory);
        assert.strictEqual(fileList.length, 1);
        assert.strictEqual(fileList[0], "test.txt");
        assert.isFalse(fs.exists(fs.join(tempDestinationDirectory, ".git")));
        assert.strictEqual(fs.read(fs.join(tempDestinationDirectory, fileList[0])), "master\n");
    } finally {
        tempSourceDirectory && fs.removeTree(tempSourceDirectory);
        tempDestinationDirectory && fs.removeTree(tempDestinationDirectory);
    }
};


// start the test runner if we"re called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
        [exports].concat(system.args.slice(1))));
}
