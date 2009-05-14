#!/usr/bin/env helma

require('core/string');
include('helma/system');
include('helma/file');
include('helma/shell');

if (args[1] && args[1].startsWith("-")) {
    switch (args[1]) {
        case "-h":
            print("Creates a new Helma NG application");
            print("Usage:");
            print("  helma create-app [path]");
            break;
        default:
            print("Unknown option", args[1]);
            break;
    }
    quit();
}

var path = args[1] 
  || readln("Please enter the directory path for your application:\n");

if (!path) {
    exit("No path, exiting.");
}

var destination = new File(path);

if (destination.exists() && !destination.isDirectory()) {
    exit(destination, "exists but is not a directory, exiting.");
} else if (destination.isDirectory() && destination.list().length > 0) {
    exit("Directory", destination, "exists but is not empty, exiting.");
}

var skeleton = new File(properties["helma.home"], "apps/skeleton");
if (!skeleton.exists() || !skeleton.isDirectory()) {
    exit("Can't find skeleton app in " + skeleton + ", exiting.");
}

write("Copying application files to", destination, "...");
skeleton.hardCopy(destination);
print("done");

function exit() {
    print.apply(null, arguments);
    quit();
}
