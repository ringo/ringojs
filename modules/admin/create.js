require('core/string');
include('helma/engine');
include('helma/file');
include('helma/shell');

export('createApplication');

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

function main(args) {
    if (args[1] && args[1].startsWith("-")) {
        switch (args[1]) {
            case "-h":
            case "--help":
                print("Creates a new Helma NG application");
                print("Usage:");
                print("  helma admin/create [path]");
                break;
            default:
                print("Unknown option", args[1]);
                break;
        }
        quit();
    }

    var path = args[1]
            || readln("Please enter the directory path for your application: ");

    if (!path) {
        print("No path, exiting.");
    } else {
        createApplication(path);
    }
}

if (require.main == module.id) {
    try {
        main(args);
    } catch (err) {
        print("Error: " + err);
        print("Exiting.");
    }
}
