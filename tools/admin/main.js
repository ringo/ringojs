
function main(args) {
    args.shift();
    if (!args.length || args[0] == "main") {
        printUsage();
    } else {
        var module;
        try {
            module = require("./" + args[0]);
        } catch (error) {
            printUsage();
            return;
        }
        module.main(args);
    }
}

function printUsage() {
    var resources = getRepository(module.resolve("./")).getResources();
    print("Please specify one of the following commands:");
    for each(var res in resources.sort()) {
        if (res.baseName !== "" && res.baseName != "main") {
            var description = require(module.resolve(res.moduleName)).description;
            print("   ", res.baseName, "\t-", description || "no description available");
        }
    }
}

if (require.main == module.id) {
    main(require('system').args);
}
