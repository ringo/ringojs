const fs = require("fs");

const HTTP_URL = /^https?:\/{2}/;
const GIT_URL = /^git:\/{2}/;
const GIT_SSH_URL = /^git+ssh:\/{2}/;

const PACKAGES_DIR = exports.PACKAGES_DIR = "packages";
const PACKAGE_JSON = exports.PACKAGE_JSON = "package.json";

const getRingoHome = exports.getRingoHome = () => {
    return fs.normal(environment["ringo.home"]);
};

const getBaseDirectory = exports.getBaseDirectory = () => {
    let dir = fs.workingDirectory();
    do {
        if (fs.exists(fs.join(dir, PACKAGE_JSON)) ||
                fs.exists(fs.join(dir, PACKAGES_DIR))) {
            return fs.canonical(dir);
        }
        dir = fs.directory(dir);
    } while (dir !== ".");
    return fs.canonical(fs.workingDirectory());
};

exports.getPackagesDirectory = (directory) => {
    return fs.normal(fs.join(directory, PACKAGES_DIR));
};

exports.isZipFile = (path) => {
    return fs.extension(path) === ".zip";
};

exports.isHttpUrl = (str) => {
    return HTTP_URL.test(str);
};

exports.isGitUrl = (str) => {
    return GIT_URL.test(str);
};

exports.isGitSshUrl = (str) => {
    return GIT_SSH_URL.test(str);
};

/**
 * Returns true if a package is installed. This method accepts multiple
 * arguments, which are all joined to the package path used to check.
 * @param {String} path The path to the package
 * @returns True if the package is installed
 * @type Boolean
 */
exports.isInstalled = function(path) {
    return fs.exists(fs.join.apply(null, Array.prototype.slice.call(arguments)));
};

exports.getDescriptor = function() {
    let path = fs.join.apply(null, Array.prototype.slice.call(arguments));
    if (fs.isDirectory(path)) {
        path = fs.join(path, PACKAGE_JSON);
    }
    if (fs.exists(path)) {
        return JSON.parse(fs.read(path));
    }
    return null;
};

exports.hasDependencies = (descriptor) => {
    return descriptor.hasOwnProperty("dependencies") &&
            Object.keys(descriptor.dependencies).length > 0;
};
