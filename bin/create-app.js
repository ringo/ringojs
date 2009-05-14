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
    print("No path, exiting.");
    quit();
}

var destination = new File(path);

if (destination.exists() && !destination.isDirectory()) {
    print(destination, "exists but not a directory, exiting");
    quit();
} else if (destination.isDirectory() && destination.list().length > 0) {
    print("Directory", destination, "exists but is not empty, exiting");
    quit()
}

var skeleton = new File(properties["helma.home"], "apps/skeleton");
if (!skeleton.exists() || !skeleton.isDirectory()) {
    print("Can't find skeleton app in " + skeleton + ", exiting");
    quit();
}
print("Copying application files to", destination, "...");
skeleton.hardCopy(destination);
print("done");
