/**
 * @fileoverview This module provides support for loading CommonJS and Narwhal packages.
 */

var system = require('system');
var engine = require('ringo/engine');
var log = require('ringo/logging').getLogger(module.id);


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
    loadPackages(engine.getPackageRepository());
	discoverClasspathModules();
}

/**
 * Load all packages contained in `repository`.
 * @param repository String|Repository a path or Ringo repository
 */
function loadPackages(repository) {
    if (typeof repository === "string") {
        repository = getRepository(repository);
    }
    if (repository && repository.exists()) {
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


/**
 * Scour the current classpath looking for Common-JS packages to be added to the repository
 * list for package resolution. A Common-JS package is identified as an archive on the Java
 * classpath containing a package.json resource in the root folder.
 * (@see http://wiki.commonjs.org/wiki/Packages/1.0)
 *
 * Note: Discovering packages that are not in an archive does not currently work. I create a
 * FileRepository object passing in the directory which holds the package.json, however when the
 * FileRpository attempts to access the package.json it says the file cannot be found. Perhaps this
 * is do to some encoded characters in my file paths? todo: Investigate
 * java.io.FileNotFoundException: /Users/jcook/Projects/Tracermedia/PPKC1001%20Web%20Site/Development/trunk/toplevel/target/classes/package.json (No such file or directory)
 */
function discoverClasspathModules() {

	var loader = java.lang.Thread.currentThread().getContextClassLoader();

	log.debug('Seeking for Common-JS packages on the classpath');

	var resources = loader.getResources('package.json');

	while (resources.hasMoreElements()) {
		var url = resources.nextElement();
		var path = url.getPath();

		var repoRoot = null;

		// If the package.json file is found in a jar/zip file, we need to strip the url
		// down to resolve the root.
		if (/^file:/.test(path)) {
			path = path.substring(5);
			repoRoot = path.split('!')[0];
		}

		// If the package.json file is found on the classpath, the path will represent the absolute
		// path to the resource which will end with '/package.json'.
		else {
			repoRoot = path.substring(0, path.lastIndexOf('/'));
		}

		if (repoRoot) {
			var repo = /\.zip$|\.jar$/.test(repoRoot)
				? new org.ringojs.repository.ZipRepository(repoRoot)
				: new org.ringojs.repository.FileRepository(repoRoot);

			log.info('Found package.json in url: ' + url.getPath() + ', repository: ' + repo);

			loadPackage(repo);
		}
	}
}
