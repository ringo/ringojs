/**
 * @fileoverview Script to create a new RingoJS web application.
 */

require('core/string');
var {join, Path, makeDirectory, move, copy, exists, symbolicLink, base} = require('fs');
var engine = require('ringo/engine');
var shell = require('ringo/shell');
var Parser = require('ringo/args').Parser;

export('createApplication', 'createPackage', 'main', 'description');

var description = "Create a new RingoJS web application or package";

/**
 * Create a new RingoJS web application at the given path.
 * @param path the path where to create the application
 */
function createApplication(path, options) {
    if (!path) {
        throw new Error("No destination path given");
    }

    var dest = new Path(path);

    if (dest.exists() && !dest.isDirectory()) {
        throw dest + " exists but is not a directory.";
    } else if (dest.isDirectory() && dest.list().length > 0) {
        throw new Error("Directory " + dest + " exists but is not empty");
    }

    var home = engine.properties["ringo.home"];

    if (options.appengine) {
        var symlink = Boolean(options.symlink);
        copyTree(home, "apps/appengine", dest);
        copyTree(home, "apps/skeleton", join(dest, "WEB-INF", "app"));
        copyTree(home, "modules", join(dest, "WEB-INF", "modules"), symlink);
        fixAppEngineDirs(dest);
        copyJars(home, dest, symlink);
    } else {
        copyTree(home, "apps/skeleton", dest);
    }
}

/**
 * Create a new RingoJS package at the given path.
 * @param path the path where to create the package
 */
function createPackage(path, options) {
    if (!path) {
        throw new Error("No destination path given");
    }

    var home = engine.properties["ringo.home"];
    var dest = new Path(home, "packages", path);

    if (dest.exists() && !dest.isDirectory()) {
        throw dest + " exists but is not a directory.";
    } else if (dest.isDirectory() && dest.list().length > 0) {
        throw new Error("Directory " + dest + " exists but is not empty");
    }

    copyTree(home, "packages/namespace-skeleton", dest);
}

function copyTree(home, from, to, symlink) {
    var source = new Path(home, from);
    if (!source.exists() || !source.isDirectory()) {
        throw new Error("Can't find directory " + source);
    }
    var msg = symlink ? "Linking" : "Copying";
    shell.write(" +", msg, from, "to", to, "... ");
    if (symlink) {
        symbolicLink(source, to);
    } else {
        source.copyTree(to);
    }
    print("done");
}

function fixAppEngineDirs(dest) {
    var webinf = join(dest, "WEB-INF");
    makeDirectory(join(webinf, "classes"));
    makeDirectory(join(webinf, "packages"));
    var staticDir = join(webinf, "app", "static");
    if (exists(staticDir)) {
        move(staticDir, join(dest, "static"));
    }
}

function copyJars(home, dest, symlink) {
    var jars = [
        "ringo.jar",
        "js.jar",
        "slf4j/slf4j-api-1.5.10.jar",
        "jnr-posix/jaffl-0.5.jar",
        "jnr-posix/jnr-posix-1.1.3.jar",
    ];
    var libsrc = join(home, "lib");
    var libdest = join(dest, "WEB-INF", "lib");
    var msg = symlink ? "Linking" : "Copying";
    shell.write(" +", msg, "jar files to", libdest, "... ");
    for each (var jar in jars) {
        if (symlink) {
            symbolicLink(join(libsrc, jar), join(libdest, base(jar)));
        } else {
            copy(join(libsrc, jar), join(libdest, base(jar)));
        }
    }
    shell.writeln("done");
}

/**
 * Create a new RingoJS web application from the command line.
 * @param args
 */
function main(args) {
    var script = args.shift();
    var parser = new Parser();
    parser.addOption("a", "appengine", null, "Create a new Google App Engine application");
    parser.addOption("s", "symlink", null, "Create symbolic links for jar and module files");
    parser.addOption("p", "package", null, "Create a new package");
    parser.addOption("h", "help", null, "Print help message and exit");
    var opts = parser.parse(args);
    if (opts.help) {
        print("Creates a new RingoJS application or package");
        print("Usage:");
        print("  ringo " + script + " [path]");
        print("Options:");
        print(parser.help());
        return;
    }

    var path = args[0]
            || shell.readln("Please enter the path for your application/package: ");

    if (!path) {
        print("No path, exiting.");
    } else if (opts.package) {
        createPackage(path, opts);
    } else {
        createApplication(path, opts);
    }
}

if (require.main == module.id) {
    try {
        main(system.args);
    } catch (error) {
        print(error);
        print("Use -h or --help to get a list of available options.");
    }
}
