/**
 * @fileoverview <p>Package loading utility module. In the top-level namespace
 * for Tusk compatibility.</p>
 */

var system = require('system');
var fs = require('fs');
var engine = require('ringo/engine');

export('load', 'normalize', 'catalog');

var catalog;

function load() {
    if (catalog || !require.paths) {
        // we're either already set up or running in secure sandbox mode
        return;
    }

    catalog = {};
    // loop through packages and configure resources
    var packages = engine.getRingoHome().getChildRepository("packages");

    if (!packages.exists()) {
        print("No packages installed, skipping package setup");
        return;
    }

    for each (var directory in packages.getRepositories()) {

        try {
            var jsonPath = directory.getResource("package.json");
            var package = JSON.parse(jsonPath.getContent());
            var name = package.name || directory.getName();
            package.directory = directory;

            // check engine specific libs
            handleResource(package.engines || "engines", function(engines) {
                var dir = directory.getChildRepository("engines");
                for each (var engine in system.engines) {
                    var path = dir.getChildRepository(engine + "/lib");
                    if (fs.isDirectory(path)) {
                        require.paths.push(path);
                    }
                }
            });

            var lib = (package.directories && package.directories.lib) || package.lib || "lib";
            handleResource(lib, function(lib) {
                require.paths.push(directory.getChildRepository(lib));
            });

            var jars = (package.directories && package.directories.jars) || package.jars;
            handleResource(jars, function(res) {
                var files;
                var path = directory.getChildRepository(res);
                if (path.exists()) {
                    files = [p for each (p in path.getResources()) if (p.getName().match(/\.jar$/))];
                } else {
                    files = [directory.getResource(res)];
                }
                for each (var file in files)
                    addToClasspath(file);
            });

            catalog[name] = package;

        } catch (error) {
            system.stderr.print("Error configuring package " + directory + ": " + error);
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
