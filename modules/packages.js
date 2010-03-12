
var system = require('system');

module.shared = true;

export('load', 'normalize', 'catalog');

var catalog;

function load() {
    if (catalog) {
        return;
    }

    catalog = {};
    // loop through packages and configure resources
    var fs = require("file");
    var packages = fs.join(system.prefix, 'packages');

    for each (var pkg in fs.list(packages)) {

        var directory = fs.join(packages, pkg);
        if (!fs.isDirectory(directory)) {
            continue;
        }

        try {
            var jsonPath = fs.join(directory, "package.json");
            var package = JSON.parse(fs.read(jsonPath).trim());
            package.directory = directory;
            var lib = package.lib || ["lib"];
            if (pkg == "narwhal") {
                lib.unshift("engines/rhino/lib", "engines/default/lib");
            }
            handleResource(lib, function(res) {
                require.paths.push(fs.join(directory, res));
            });
            handleResource(package.jars, function(res) {
                addToClasspath(fs.join(directory, res))
            });

            catalog[pkg] = package;

        } catch (error) {
            system.stderr.print("Error configuring package " + pkg + ": " + error);
        }
    }
}

function normalize(catalog) {
    // TODO
}

// helper function to set up package resources
function handleResource(res, callback) {
    if (Array.isArray(res)) {
        res.forEach(callback);
    } else if (res) {
        callback(res);
    }
}