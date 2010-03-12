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
    system.prefix = home.getPath();
    system.prefixes = [system.prefix];

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

    // TODO setting up packages here doesn't help because module will be reloaded
    var packages = require("packages");
    packages.load(home);

})();