const fs = require("fs");
const {Parser} = require("ringo/args");
const term = require("ringo/term");

const packages = require("../utils/packages");
const shell = require("../utils/shell");
const install = require("./install");

const parser = new Parser();
parser.addOption("a", "app-source", "[DIR]", "Copy application from [DIR] instead of skeleton");
parser.addOption("g", "google-app-engine", null, "Create a new Google App Engine application");
parser.addOption("p", "ringo-package", null, "Create a new Ringo package");
parser.addOption("s", "symlink", null, "Create symbolic links for jar and module files");
parser.addOption("w", "java-web-app", null, "Create a new Java Web application (WAR)");
parser.addOption("h", "help", null, "Print help message and exit");

/** @ignore */
exports.description = "Create a new RingoJS web application or package";

/**
 * Create a new RingoJS web application at the given path.
 * @param {String} path The path where to create the application
 * @param {Object} options Options defining the application to create
 */
const createApplication = (path, options) => {
    const destination = getDestinationPath(path);
    const home = packages.getRingoHome();
    const skeletons = fs.join(home, "tools/admin/skeletons");
    const appSource = options.appSource || fs.join(skeletons, "app");
    const appTemplate = options.googleAppEngine ? "appengine" :
            options.javaWebApp ? "webapp" : null;
    if (appTemplate) {
        const symlink = Boolean(options.symlink);
        copyTree(fs.join(skeletons, appTemplate), destination);
        // symlink app source if requested unless it's the skeleton app
        if (!options.googleAppengine) {
            copyTree(appSource, fs.join(destination, "WEB-INF/app"), symlink && options.appSource);
        }
        copyTree(fs.join(home, "modules"), fs.join(destination, "WEB-INF/modules"), symlink);
        createAppEngineDirs(destination);
        copyJars(home, destination, symlink);
    } else if (copyTree(appSource, destination)) {
        if (!options.appSource) {
            const descriptor = packages.getDescriptor(destination);
            term.writeln("Installing dependencies ...");
            const packagesDirectory = fs.join(destination, "packages");
            if (!fs.exists(packagesDirectory)) {
                fs.makeDirectory(packagesDirectory);
            }
            install.installDependencies(descriptor, packagesDirectory);
        }
    }
    term.writeln(term.GREEN, "Created application in", path, term.RESET);
};

/**
 * Create a new RingoJS package at the given path.
 * @param {String} path The path where to create the package
 * @param {Object} options Package options
 */
const createPackage = (path, options) => {
    const destination = getDestinationPath(path);
    const home = packages.getRingoHome();
    const source = fs.join(home, "tools/admin/skeletons/package");
    copyTree(source, destination);
    term.writeln(term.GREEN, "Created RingoJS package in", path, term.RESET);
};

const copyTree = (source, destination, asSymLink) => {
    if (!fs.exists(source) || !fs.isDirectory(source)) {
        term.writeln(term.RED, "Can't find directory", source, term.RESET);
        return false;
    }
    term.write((asSymLink ? "Linking" : "Copying"), source, "to", destination, "... ");
    if (asSymLink) {
        fs.symbolicLink(source, destination);
    } else {
        fs.copyTree(source, destination);
    }
    term.writeln("done");
    return true;
};

const createAppEngineDirs = (destination) => {
    const webInf = fs.join(destination, "WEB-INF");
    fs.makeDirectory(fs.join(webInf, "lib"));
    fs.makeDirectory(fs.join(webInf, "packages"));
    const staticDir = fs.join(webInf, "app/static");
    if (fs.exists(staticDir)) {
        fs.move(staticDir, fs.join(destination, "static"));
    }
};

const copyJars = (home, destination, asSymLink) => {
    term.write("Copying JAR files ... ");
    const jars = [
        "ringo-core.jar",
        fs.list(fs.join(packages.getRingoHome(), "lib")).find(jar => {
            return jar.startsWith("rhino") && jar.endsWith(".jar")
        })
    ];
    const libSource = fs.join(home, "lib");
    const libDestination = fs.join(destination, "WEB-INF/lib");
    term.writeln(" +", (asSymLink ? "Linking" : "Copying"), "jar files to", libDestination, "... ");
    jars.forEach(jar => {
        if (asSymLink) {
            fs.symbolicLink(fs.join(libSource, jar), fs.join(libDestination, fs.base(jar)));
        } else {
            fs.copy(fs.join(libSource, jar), fs.join(libDestination, fs.base(jar)));
        }
    });
    term.writeln("done");
};

const getDestinationPath = (path) => {
    if (!path) {
        throw new Error("No destination path given");
    } else if (fs.exists(path)) {
        if (!fs.isDirectory(path)) {
            term.writeln(term.RED, path, "exists, but is not a directory", term.RESET);
        } else if (fs.list(path).length > 0) {
            term.writeln(term.RED, path, "exists, but is not empty", term.RESET);
        }
    }
    return path;
};

exports.help = () => {
    term.writeln("\n" + exports.description, "\n");
    term.writeln("Usage:");
    term.writeln("  ringo-admin create [path]");
    term.writeln("\nOptions:");
    term.writeln(parser.help());
    term.writeln();
};

/**
 * Create a new RingoJS web application from the command line.
 * @param args
 */
exports.run = (args) => {
    const options = parser.parse(args);
    if (options.help) {
        term.writeln("Creates a Ringo application or package.");
        term.writeln();
        term.writeln("Usage:");
        term.writeln("  ringo-admin create [options] [path]");
        term.writeln();
        term.writeln("Options:");
        term.writeln(parser.help());
        return;
    } else if (!!options.googleAppengine + !!options.ringoPackage + !!options.javaWebapp > 1) {
        term.writeln(term.RED, "Options are mutually exclusive.", term.RESET);
    }

    const type = options.googleAppEngine ? "Google App Engine app":
        options.ringoPackage ? "Ringo package" :
            options.javaWebApp ? "Java web application" :
                "Ringo web application";

    const path = fs.absolute(args[0] || shell.readln("Path for new " + type + ": "));
    if (prepare(path, type)) {
        term.writeln(term.GREEN, "Creating", type, "in", path, term.RESET);
        if (options.ringoPackage) {
            createPackage(path, options);
        } else {
            createApplication(path, options);
        }
    }
};

const prepare = (path, type) => {
    if (fs.exists(path)) {
        if (fs.isDirectory(path)) {
            if (fs.list(path).length > 0) {
                term.writeln(term.RED, path, "exists, but is not empty");
                return false;
            }
        } else {
            term.writeln(term.RED, path, "exists, but is not a directory");
            return false;
        }
    } else {
        if (shell.prompt("Create " + type + " in " + path + " ?", ["y", "n"], "n") !== "y") {
            term.writeln("Aborted");
            return false;
        }
        fs.makeTree(path);
    }
    return true;
};
