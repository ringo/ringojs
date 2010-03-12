/**
 *  @fileoverview Compatibility shim for narwhal mode
 */

// this is running in global scope, so use a closure
(function() {
    // preload and tweak some modules
    var system = require("system");
    system.engine = "rhino";
    system.engines = ["rhino", "default"];
    // system.supportsTusk = true;
    require("core/regexp");
    require("binary");
    var io = require("io");
    io.IO = io.Stream;

    var engine = org.ringojs.engine.RhinoEngine.getEngine();
    var home = engine.getRingoHome();
    system.prefixes = [home.getPath()];

    // TODO we want to support require.loader
    require.loader = {
        usingCatalog: true,
        isLoaded: function() {
            return false;
        },
        resolve: function(id, baseId) {
            return id;
        }
    };

    // helper function to set up package resources
    function handleResource(res, callback) {
        if (Array.isArray(res)) {
            res.forEach(callback);
        } else {
            callback(res);
        }
    }

    // loop through packages and configure resources
    var fs = require("file");
    var packages = home.getChildRepository("packages").path;
    for each (var package in fs.list(packages)) {
        try {
            var packagePath = fs.join(packages, package);
            var jsonPath = fs.join(packagePath, "package.json");
            var pkg = JSON.parse(fs.read(jsonPath).trim());
            var lib = pkg.lib || ["lib"];
            if (package == "narwhal") {
                lib.unshift("engines/rhino/lib", "engines/default/lib");
            }
            handleResource(lib, function(res) {
                require.paths.push(fs.join(packagePath, res));
            });
            if (pkg.jars) {
                handleResource(pkg.jars, function(res) {
                    addToClasspath(fs.join(packagePath, res))
                });
            }
        } catch (error) {
            system.stderr.print("Error configuring package " + package + ": " + error);   
        }
    }

    // TODO setting up packages here doesn't help because module will be reloaded
    // var packages = require("packages");
    // packages.main();

})();