/**
 * @fileoverview Download and install a RingoJS package from a zip URL
 */

var system = require("system");
var shell = require("ringo/shell");
var fs = require("fs");
var files = require("ringo/utils/files");
var {ZipFile} = require("ringo/zip");
var {Parser} = require("ringo/args");
var strings = require('ringo/utils/strings');

export('installPackage', 'main', 'description');

/** @ignore */
var description = "Download and install a RingoJS package from a zip URL";

/**
 * Install package from the given zip url into the packages directory
 * @param {String} url the URL of a zipped package
 * @param {Object} options
 */
function installPackage(url, options) {
    var packages = (options && options.packages)
            ||fs.join(system.prefix, "packages");
    // expand foo/bar to a github zipball url for user foo, project bar
    if (url.match(/^\w+\/[\w\-_\.]+$/)) {
        url = "http://github.com/" + url + "/zipball/master";
    }
    url = new java.net.URL(url);
    var temp = files.createTempFile("ringo-install", ".zip");
    try {
        print("Downloading " + url);
        var out = fs.openRaw(temp, {write: true});
        new Stream(url.openStream()).copy(out).close();
        out.close();
        var zip = new ZipFile(temp);
        // get common prefix shared by all items in zip file
        var prefix = zip.entries.reduce(function(prev, current) {
            return strings.getCommonPrefix(prev, current);
        });
        // we assume package.json to be in prefix/package.json
        var json = prefix + "package.json";
        if (!zip.isFile(json)) {
            throw json + " not found in zip file";
        }
        var package = JSON.parse(zip.open(json).read().decodeToString("UTF-8"));
        var name = package.name
                || fail("package.json does not contain a package name");
        var dir = fs.join(packages, name);
        if (fs.exists(dir)) {
            if (!options.force)
                throw new Error("Package already installed: " + dir);
            print("Removing currently installed version of package " + name);
            fs.removeTree(dir);
        }
        print("Installing package " + name);
        for each (var entry in zip.entries) {
            var path = fs.join(dir, entry.substring(prefix.length));
            if (zip.isDirectory(entry)) {
                fs.makeDirectory(path);
            } else {
                print(" + " + path);
                var parent = fs.directory(path);
                if (!fs.isDirectory(parent)) {
                     fs.makeTree(parent);
                }
                var dest = fs.openRaw(path, {write: true});
                zip.open(entry).copy(dest).close();
            }
            if (entry.time > -1) {
                fs.touch(path, entry.time);
            }
        }
        // create symlinks for binaries and make executable
        var bindir = fs.join(dir, "bin");
        if (fs.isDirectory(bindir)) {
            var ringoBin = fs.join(system.prefix, "bin");
            for each (var bin in fs.list(bindir)) {
                var binfile = fs.join(bindir, bin);
                fs.changePermissions(binfile, 0755);
                fs.symbolicLink(binfile, fs.join(ringoBin, bin));
            }
        }
        print("Done");
    } finally {
        if (fs.exists(temp)) {
            fs.remove(temp);
        }
    }
}

function fail(message) {
    throw message;
}

/**
 * Install a RingoJS package from a zip URL.
 * @param args
 */
function main(args) {
    var script = args.shift();
    var parser = new Parser();
    parser.addOption("p", "packages", "DIR", "Packages directory to install into");
    parser.addOption("h", "help", null, "Print help message and exit");
    parser.addOption("f", "force", null, "Force install, even if package already exists");
    var opts = parser.parse(args);
    if (opts.help) {
        print("Creates a new RingoJS application");
        print("Usage:");
        print("  ringo " + script + " [url]");
        print("Options:");
        print(parser.help());
        return;
    }

    var url = args[0]
            || shell.readln("Please enter the URL of the zip file to install: ");

    if (!url) {
        print("No url, exiting.");
    } else {
        installPackage(url, opts);
    }
}

if (require.main == module) {
    main(system.args);
}
