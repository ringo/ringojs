
var system = require('system');
var fs = require('file');

module.shared = true;

export('load', 'normalize', 'catalog');

var catalog;

function load() {
    if (catalog) {
        return;
    }

    catalog = {};
    // loop through packages and configure resources
    var packages = fs.join(system.prefix, 'packages');

    if (!fs.isDirectory(packages)) {
        print("No packages directory, skipping package setup");
        return;
    }

    for each (var pkg in fs.list(packages)) {

        var directory = fs.join(packages, pkg);
        if (!fs.isDirectory(directory)) {
            continue;
        }

        try {
            var jsonPath = fs.join(directory, "package.json");
            var package = JSON.parse(fs.read(jsonPath));
            package.directory = directory;

            // check engine specific libs
            handleResource(package.engines || "engines", function(engines) {
                var dir = fs.join(directory, engines);
                for each (var engine in system.engines) {
                    var path = fs.join(dir, engine, "lib");
                    if (fs.isDirectory(path)) {
                        require.paths.push(path);
                    }
                }
            });
            handleResource(package.lib || "lib", function(lib) {
                require.paths.push(fs.join(directory, lib));
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
