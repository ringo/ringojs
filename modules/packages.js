/**
 * @fileoverview <p>Package loading utility module. In the top-level namespace
 * for Tusk compatibility.</p>
 */

var system = require('system');
var engine = require('ringo/engine');

export('load', 'loadPackages', 'loadPackage', 'normalize', 'catalog');

var catalog;

function load() {
    // Check if we're either already set up or running in secure sandbox mode.
    if (catalog || !require.paths) {
        return;
    }
    catalog = {};
    loadPackages(engine.getRingoHome().getChildRepository("packages"));
}

function loadPackages(repository) {
    if (repository.exists()) {
        repository.getRepositories().forEach(loadPackage);
    }
}

function loadPackage(repository) {
    try {
        var jsonPath = repository.getResource("package.json");
        var pkg = JSON.parse(jsonPath.getContent());
        var name = pkg.name || repository.getName();
        pkg.directory = repository;

        // check engine specific libs
        handleResource(pkg.engines || "engines", function(engines) {
            var dir = repository.getChildRepository("engines");
            for each (var engine in system.engines) {
                var path = dir.getChildRepository(engine + "/lib");
                if (path.exists()) {
                    require.paths.push(path);
                }
            }
        });

        var lib = (pkg.directories && pkg.directories.lib) || pkg.lib || "lib";
        handleResource(lib, function(lib) {
            require.paths.push(repository.getChildRepository(lib));
        });

        var jars = (pkg.directories && pkg.directories.jars) || pkg.jars;
        handleResource(jars, function(res) {
            var files;
            var path = repository.getChildRepository(res);
            if (path.exists()) {
                files = [p for each (p in path.getResources())
                           if (p.getName().match(/\.jar$/))];
            } else {
                files = [repository.getResource(res)];
            }
            for each (var file in files) {
                addToClasspath(file);
            }
        });

        catalog[name] = pkg;

    } catch (error) {
        system.stderr.print(
                "Error configuring package " + repository + ": " + error);
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
