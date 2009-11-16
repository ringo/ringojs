require('core/string');
var file = require('file');
var engine = require('helma/engine');
var shell = require('helma/shell');
var Parser = require('helma/args').Parser;

export('createApplication');

/**
 * Create a new Helma NG web application at the given path.
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

    var home = engine.properties["helma.home"];

    if (options.appengine) {
        copyTree(home, "apps/appengine", dest);
        copyTree(home, "modules", file.join(dest, "WEB-INF", "modules"));
        copyTree(home, "apps/skeleton", file.join(dest, "WEB-INF", "app"));
        file.move(file.join(dest, "WEB-INF", "app", "static"), file.join(dest, "static"));
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

function copyJars(home, dest) {
    var jars = ["helma.jar", "js.jar", "log4j-1.2.15.jar"];
    var libsrc = file.join(home, "lib");
    var libdest = file.join(dest, "WEB-INF", "lib");
    for each (var jar in jars) {
        file.copy(file.join(libsrc, jar), file.join(libdest, jar));
    }
}

/**
 * Create a new Helma NG web application from the command line.
 * @param args
 */
function main(args) {
    var script = args.shift();
    var parser = new Parser();
    parser.addOption("a", "appengine", null, "Create a new Google App Engine application");
    parser.addOption("h", "help", null, "Print help message and exit");
    var opts = parser.parse(args);
    if (opts.help) {
        print("Creates a new Helma NG application");
        print("Usage:");
        print("  helma " + script + " [path]");
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
    // try {
        main(system.args);
    /* } catch (error) {
        print(error);
        print("Use -h or --help to get a list of available options.");
    } */
}
