const log = require("ringo/logging").getLogger(module.id);
const fs = require("fs");
const process = require("./process");
const files = require("./files");

exports.clone = (url, treeish) => {
    const directory = files.createTempDirectory();
    log.debug("Cloning git repository {} (tree-ish: {}) into {}",
            url, (treeish || "-"), directory);
    try {
        if (treeish) {
            // do a shallow clone if possible
            const refs = getRemoteRefs(url);
            if (refs.includes(treeish)) {
                return shallowClone(url, directory, treeish);
            }
            return fullClone(url, directory, treeish);
        }
        return fullClone(url, directory);
    } catch (e) {
        fs.exists(directory) && fs.removeTree(directory);
        throw new Error("Failed to clone " + url + ": " + e.message, {cause: e});
    }
};

const getRemoteRefs = exports.getRemoteRefs = (url) => {
    const command = [
        "git",
        "ls-remote",
        "--heads",
        "--tags",
        "--refs",
        "--quiet",
        url
    ];
    const refs = process.execute(command).decodeToString();
    return refs.trim().split("\n").reduce((refs, line) => {
        const rawRef = line.split(/\s+/)[1];
        const ref = rawRef.split("/").pop() || null;
        if (ref) {
            refs.push(ref);
        }
        return refs;
    }, []);
};

const shallowClone = exports.shallowClone = (url, directory, treeish) => {
    const command = [
        "git",
        "-C", directory,
        "clone",
        "--depth", "1",
        "--branch", treeish,
        "--recurse-submodules",
        "--quiet",
        url,
        directory
    ];
    log.debug("Shallow cloning ", url, "(tree-ish:" + treeish + ") into", directory);
    process.execute(command).decodeToString();
    return directory;
};

const fullClone = exports.fullClone = (url, directory, treeish) => {
    const command = [
        "git",
        "-C", directory,
        "clone",
        "--shallow-submodules",
        "--recurse-submodules",
        "--quiet",
        url,
        directory
    ];
    log.debug("Full cloning ", url, "into", directory);
    process.execute(command);
    if (treeish !== null && treeish !== undefined) {
        checkout(directory, treeish);
    }
    return directory;
};

const checkout = exports.checkout = (directory, treeish) => {
    const command = [
        "git",
        "-C", directory,
        "checkout",
        "--quiet",
        treeish
    ];
    log.debug("Checking out", treeish);
    process.execute(command);
};

exports.install = (sourceDirectory, destinationDirectory) => {
    fs.listTree(sourceDirectory)
            .filter(path => path.length > 0 && !path.startsWith(".git"))
            .forEach(path => {
                const source = fs.join(sourceDirectory, path);
                const dest = fs.join(destinationDirectory, path);
                if (fs.isDirectory(source)) {
                    fs.makeDirectory(dest);
                } else {
                    fs.copy(source, dest);
                }
                log.debug("Copied {} to {}", source, dest);
            });
};
