require('core/string');
var file = require('file');
var engine = require('ringo/engine');
var shell = require('ringo/shell');
var Parser = require('ringo/args').Parser;

export('createApplication');

/**
 * Create a new RingoJS web application at the given path.
 * @param path the path where to create the application
 */
function createApplication(path, options) {
    if (!path) {
        throw "No destination path given.";
    }

    var dest = new file.Path(path);

    if (dest.exists() && !dest.isDirectory()) {
        throw dest + " exists but is not a directory.";
    } else if (dest.isDirectory() && dest.list().length > 0) {
        throw "Directory " + dest + " exists but is not empty.";
    }

    var home = engine.properties["ringo.home"];

    if (options.appengine) {
        copyTree(home, "apps/appengine", dest);
        copyTree(home, "modules", file.join(dest, "WEB-INF", "modules"));
        copyTree(home, "apps/skeleton", file.join(dest, "WEB-INF", "app"));
        fixAppEngineDirs(dest);
        copyJars(home, dest);
    } else {
        copyTree(home, "apps/skeleton", dest);
    }
}

function copyTree(home, from, to) {
    var source = new file.Path(file.join(home, from));
    if (!source.exists() || !source.isDirectory()) {
        throw "Can't find directory " + source + ".";
    }

    shell.write("Copying files from " + from + " to "  + to + "... ");
    source.copyTree(to);
    print("done");
}

function fixAppEngineDirs(dest) {
    file.mkdir(file.join(dest, "static"));
    var webinf = file.join(dest, "WEB-INF");
    file.mkdir(file.join(webinf, "lib"));
    file.mkdir(file.join(webinf, "classes"));
    file.move(file.join(webinf, "app", "static"), file.join(dest, "static"));    
}

function copyJars(home, dest) {
    var jars = [
        "ringo.jar",
        "js.jar",
        "log4j-1.2.15.jar",
        "slf4j/slf4j-api-1.5.10.jar",
        "slf4j/slf4j-log4j12-1.5.10.jar"
    ];
    var libsrc = file.join(home, "lib");
    var libdest = file.join(dest, "WEB-INF", "lib");
    for each (var jar in jars) {
        file.copy(file.join(libsrc, jar), file.join(libdest, file.basename(jar)));
    }
}

/**
 * Create a new RingoJS web application from the command line.
 * @param args
 */
function main(args) {
    var script = args.shift();
    var parser = new Parser();
    parser.addOption("a", "appengine", null, "Create a new Google App Engine application");
    parser.addOption("h", "help", null, "Print help message and exit");
    var opts = parser.parse(args);
    if (opts.help) {
        print("Creates a new RingoJS application");
        print("Usage:");
        print("  ringo " + script + " [path]");
        print("Options:");
        print(parser.help());
        return;
    }

    var path = args[0]
            || shell.readln("Please enter the path for your application: ");

    if (!path) {
        print("No path, exiting.");
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
