/**
 * @fileoverview This module provides support for loading CommonJS and Narwhal packages.
 */

var system = require('system');
var engine = require('ringo/engine');

export('load', 'loadPackages', 'loadPackage', 'normalize', 'catalog');

/**
 * @ignore
 */
var catalog;

/**
 * Load packages from the default `packages` directory.
 */
function load() {
    // Check if we're either already set up or running in secure sandbox mode.
    if (catalog || !require.paths) {
        return;
    }
    catalog = {};
    loadPackages(engine.getRingoHome().getChildRepository("packages"));
}

/**
 * Load all packages contained in `repository`.
 * @param repository String|Repository a path or Ringo repository
 */
function loadPackages(repository) {
    if (typeof repository === "string") {
        repository = getRepository(repository);
    }
    if (repository.exists()) {
        repository.getRepositories().forEach(loadPackage);
    }
}

/**
 * Load a single package located in `repository`.
 * @param repository String|Repository a path or Ringo repository
 */
function loadPackage(repository) {
    if (typeof repository === "string") {
        repository = getRepository(repository);
    }
    try {
        var jsonPath = repository.getResource("package.json");
        var pkg = JSON.parse(jsonPath.getContent());
        var name = pkg.name || repository.getName();
        if (catalog[name]) {
            system.stderr.print(
                    "Tried to load package `" + name + "` " +
                    "from `" + repository + "`, but a package with the same " +
                    "name has already been loaded " +
                    "from `" + catalog[name].directory + "`.");
            return;
        }

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

/**
 * @ignore
 */
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
