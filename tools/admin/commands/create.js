const log = require("ringo/logging").getLogger(module.id);
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

exports.help = [
    "\n" + exports.description + "\n",
    "Usage:",
    "  ringo-admin create [path]",
    "\nOptions:",
    parser.help(),
    ""
].join("\n");

/**
 * Create a new RingoJS web application at the given path.
 * @param {String} path The path where to create the application
 * @param {Object} options Options defining the application to create
 */
const createApplication = (path, options) => {
    log.info("Creating application in {} (options: {}) ...", path, JSON.stringify(options));
    const home = packages.getRingoHome();
    const skeletons = fs.join(home, "tools/admin/skeletons");
    const appSource = options.appSource || fs.join(skeletons, "app");
    const appTemplate = options.googleAppEngine ? "appengine" :
            options.javaWebApp ? "webapp" : null;
    if (appTemplate) {
        const symlink = Boolean(options.symlink);
        copyTree(fs.join(skeletons, appTemplate), path);
        // symlink app source if requested unless it's the skeleton app
        if (!options.googleAppengine) {
            copyTree(appSource, fs.join(path, "WEB-INF/app"), symlink && options.appSource);
        }
        copyTree(fs.join(home, "modules"), fs.join(path, "WEB-INF/modules"), symlink);
        createAppEngineDirs(path);
        copyJars(home, path, symlink);
    } else if (copyTree(appSource, path)) {
        if (!options.appSource) {
            const descriptor = packages.getDescriptor(path);
            term.writeln("Installing dependencies ...");
            const packagesDirectory = fs.join(path, "packages");
            if (!fs.exists(packagesDirectory)) {
                fs.makeDirectory(packagesDirectory);
            }
            install.installDependencies(descriptor, packagesDirectory);
        }
    }
    log.info("Created application in", path);
    term.writeln(term.GREEN, "Created application in", path, term.RESET);
};

/**
 * Create a new RingoJS package at the given path.
 * @param {String} path The path where to create the package
 */
const createPackage = (path) => {
    log.info("Creating package in", path);
    const home = packages.getRingoHome();
    const source = fs.join(home, "tools/admin/skeletons/package");
    copyTree(source, path);
    log.info("Created package in", path);
    term.writeln(term.GREEN, "Created RingoJS package in", path, term.RESET);
};

const copyTree = (source, destination, asSymLink) => {
    if (!fs.exists(source) || !fs.isDirectory(source)) {
        throw new Error("Source directory " + source + " doesn't exist");
    }
    term.write((asSymLink ? "Linking" : "Copying"), source, "to", destination, "... ");
    if (asSymLink) {
        log.info("Linking {} to {} ...", source, destination);
        fs.symbolicLink(source, destination);
    } else {
        log.info("Copying tree {} to {} ...", source, destination);
        fs.copyTree(source, destination);
    }
    log.info("done");
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
    log.info("Copying .jar files from {} to {} (as symlink: {}) ...", home, destination, asSymLink);
    term.write("Copying .jar files ... ");
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
    log.info("done");
    term.writeln("done");
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
            createPackage(path);
        } else {
            createApplication(path, options);
        }
    }
};

const prepare = (path, type) => {
    if (fs.exists(path)) {
        if (fs.isDirectory(path)) {
            if (fs.list(path).length > 0) {
                log.warn("Destination path {} exists, but is not a directory", path);
                term.writeln(term.RED, path, "exists, but is not empty");
                return false;
            }
        } else {
            log.warn("Destination directory {} exists, but is not empty", path);
            term.writeln(term.RED, path, "exists, but is not a directory");
            return false;
        }
    } else {
        if (shell.prompt("Create " + type + " in " + path + " ?", ["y", "n"], "n") !== "y") {
            log.info("User aborted creation of {} in {}", type, path);
            term.writeln("Aborted");
            return false;
        }
        fs.makeTree(path);
    }
    return true;
};
