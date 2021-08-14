const term = require("ringo/term");
const {Parser} = require("ringo/args");
const fs = require("fs");

const constants = require("../constants");
const packages = require("../utils/packages");
const specs = require("../utils/specs");
const files = require("../utils/files");
const httpClient = require("../utils/httpclient");
const archive = require("../utils/archive");
const git = require("../utils/git");
const shell = require("../utils/shell");

const parser = new Parser();
parser.addOption("g", "global", null, "Install package globally");
parser.addOption("f", "force", null, "Answer all prompts with 'yes'");

exports.description = "Install package(s)"

exports.help = () => {
    term.writeln("\n" + exports.description, "\n");
    term.writeln("Usage:");
    term.writeln("  ringo-admin install");
    term.writeln("  ringo-admin install <zipball file>");
    term.writeln("  ringo-admin install <zipball url>");
    term.writeln("\nOptions:");
    term.writeln(parser.help());
    term.writeln();
};

exports.run = (args) => {
    const options = {};
    try {
        parser.parse(args, options);
    } catch (e) {
        term.writeln(term.RED, e.message, term.RESET);
        term.writeln("Available options:");
        term.writeln(parser.help());
        return;
    }
    const baseDirectory = (options.global === true) ?
        packages.getRingoHome() :
        packages.getBaseDirectory();
    const packagesDirectory = packages.getPackagesDirectory(baseDirectory);
    if (!fs.exists(packagesDirectory)) {
        fs.makeDirectory(packagesDirectory);
    }
    if (args.length === 0) {
        const descriptor = packages.getDescriptor(baseDirectory);
        if (!descriptor) {
            throw new Error("No package.json file found in " + baseDirectory);
        }
        return installDependencies(descriptor, packagesDirectory,
                options.force === true);
    } else {
        return args.map(url => {
            return installPackage(url, packagesDirectory,
                options.force === true);
        });
    }
};

const confirmInstall = (name, installDirectory, force) => {
    if (fs.exists(installDirectory)) {
        if (force !== true) {
            term.writeln(term.RED, "The package", name, "is already installed in",
                installDirectory, term.RESET);
            if (!shell.continue("n")) {
                term.writeln("Aborted");
                return false;
            }
        }
        fs.removeTree(installDirectory);
        return true;
    }
    return true;
};

const installDependencies = exports.installDependencies = (descriptor, packagesDirectory, force) => {
    const {dependencies} = descriptor;
    return Object.keys(dependencies).map(dependency => {
        const url = dependencies[dependency];
        if (!specs.isValidUrl(url)) {
            term.writeln(term.RED, "Dependency", dependency, "of", descriptor.name,
                "has an invalid package url '" + url + "'", term.RESET);
        } else {
            return installPackage(url, packagesDirectory, force);
        }
    });
};

const installPackage = exports.installPackage = (url, packagesDirectory, force) => {
    if (!specs.isValidUrl(url)) {
        term.writeln(term.RED, "Invalid package url '" + url + "'", term.RESET);
        return;
    }
    const spec = specs.get(url);
    switch (spec.type) {
        case constants.TYPE_HTTP:
            return installArchive(spec, packagesDirectory, force);
        case constants.TYPE_GIT:
            return installGit(spec, packagesDirectory, force);
    }
};

const installArchive = exports.installArchive = (spec, packagesDirectory, force) => {
    term.writeln("Installing package from", spec.url);
    const tempArchive = httpClient.getBinary(spec.url);
    const tempDirectory = archive.extract(tempArchive);
    const descriptor = packages.getDescriptor(tempDirectory);
    if (!descriptor) {
        throw new Error("Missing or invalid package.json in " + spec.url);
    }
    const installDirectory = files.getInstallDirectory(packagesDirectory, descriptor.name);
    if (!confirmInstall(descriptor.name, installDirectory, force === true)) {
        fs.removeTree(tempDirectory);
    } else {
        archive.install(tempDirectory, installDirectory);
        term.writeln(term.GREEN, "Installed", descriptor.name, "(" + descriptor.version + ") in", installDirectory, term.RESET);
        if (packages.hasDependencies(descriptor)) {
            term.writeln("Installing dependencies of", descriptor.name, "...");
            installDependencies(descriptor, packagesDirectory, force);
        }
    }
};

const installGit = exports.installGit = (spec, packagesDirectory, force) => {
    const tempDirectory = git.clone(spec.url, spec.treeish);
    const descriptor = packages.getDescriptor(tempDirectory);
    if (!descriptor) {
        throw new Error("Missing or invalid package.json in " + spec.url);
    }
    const installDirectory = files.getInstallDirectory(packagesDirectory, descriptor.name);
    if (!confirmInstall(descriptor.name, installDirectory, force === true)) {
        fs.removeTree(tempDirectory);
    } else {
        fs.makeDirectory(installDirectory, 0o755);
        git.install(tempDirectory, installDirectory);
        fs.removeTree(tempDirectory);
        term.writeln(term.GREEN, "Installed", descriptor.name, "(" + descriptor.version + ")", "in", installDirectory, term.RESET);
        if (packages.hasDependencies(descriptor)) {
            term.writeln("Installing dependencies of", descriptor.name, "...");
            installDependencies(descriptor, packagesDirectory, force);
        }
    }
};
