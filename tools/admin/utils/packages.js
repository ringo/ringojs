const fs = require("fs");

const PACKAGES_DIR = exports.PACKAGES_DIR = "packages";
const PACKAGE_JSON = exports.PACKAGE_JSON = "package.json";

exports.getRingoHome = () => {
    return fs.normal(environment["ringo.home"]);
};

exports.getBaseDirectory = () => {
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

const getDescriptor = exports.getDescriptor = function() {
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

exports.save = (directory, installed) => {
    const descriptor = getDescriptor(directory) || {dependencies: {}};
    installed.forEach(dependency => {
        descriptor.dependencies[dependency.name] = dependency.url;
    });
    // sort dependencies
    descriptor.dependencies = Object.keys(descriptor.dependencies)
            .sort()
            .reduce((result, name) => {
                 result[name] = descriptor.dependencies[name];
                 return result;
            }, {});
    const destination = fs.join(directory, PACKAGE_JSON);
    fs.write(destination, JSON.stringify(descriptor, null, 4));
    return destination;
};
