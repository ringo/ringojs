require('core/string');
include('helma/engine');
include('helma/file');
include('helma/shell');
include('helma/args');

export('createApplication');

/**
 * Create a new Helma NG web application at the given path.
 * @param path the path where to create the application
 */
function createApplication(path) {
    if (!path) {
        throw "No destination path given.";
    }
    var dest = new File(path);

    if (dest.exists() && !dest.isDirectory()) {
        throw dest + " exists but is not a directory.";
    } else if (dest.isDirectory() && dest.list().length > 0) {
        throw "Directory " + dest + " exists but is not empty.";
    }

    var skeleton = new File(properties["helma.home"], "apps/skeleton");
    if (!skeleton.exists() || !skeleton.isDirectory()) {
        throw "Can't find skeleton app in " + skeleton + ".";
    }

    write("Copying application skeleton to", dest, "... ");
    skeleton.hardCopy(dest);
    print("done");
}

/**
 * Create a new Helma NG web application from the command line.
 * @param args
 */
function main(args) {
    var script = args.shift();
    var parser = new Parser();
    // parser.addOption("a", "appengine", "PATH",
    //         "Create a Google App Engine app using the given SDK path");
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
            || readln("Please enter the path for your application: ");

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
