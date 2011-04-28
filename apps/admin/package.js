/**
 * @fileoverview Script to package up an existing RingoJS application as a WAR.
 */

var strings = require('ringo/utils/strings');
var {join, Path, makeDirectory, move, copy, exists, symbolicLink, base, removeTree} = require('fs');
var engine = require('ringo/engine');
var shell = require('ringo/shell');
var Parser = require('ringo/args').Parser;

export('createApplication', 'main', 'description');

var description = "Package an existing RingoJS application as a WAR";

// used for native zipping, can be removed if Java zipping is used instead
/*
function run(command, dir) {
  var r = [], s;
  var p = java.lang.Runtime.getRuntime().exec(command, [], new java.io.File(dir));
  var i = new java.io.BufferedReader(
    new java.io.InputStreamReader(p.getInputStream()));  
  while ((s = i.readLine()) != null) {
      r.push(s);
  }
  return r;
}
*/

function copyStream(file, out) {
    var input = new java.io.FileInputStream(file);
    try {
        var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
        while (true) {
          var readCount = input.read(buffer);
          if (readCount < 0) {
            break;
          }
          out.write(buffer, 0, readCount);
        }
    } finally {
      input.close();
    }
}

function zip(directory, zipfile) {  
    directory = java.io.File(directory);
    zipfile = java.io.File(zipfile);   
    var base = directory.toURI();
    var queue = new java.util.LinkedList();
    queue.push(directory);
    var out = new java.io.FileOutputStream(zipfile);
    var res = out;
    try {
      var zout = new java.util.zip.ZipOutputStream(out);
      res = zout;
      while (!queue.isEmpty()) {
        directory = queue.pop();
        var files = directory.listFiles();
        for (var i in files) {
          var kid = files[i];
          var name = base.relativize(kid.toURI()).getPath();
          if (kid.isDirectory()) {
            queue.push(kid);
            name = name.charAt(name.length - 1) == '/' ? name : name + "/";
            zout.putNextEntry(new java.util.zip.ZipEntry(name));
          } else {
            zout.putNextEntry(new java.util.zip.ZipEntry(name));
            copyStream(kid, zout);
            zout.closeEntry();
          }
        }
      }
    } finally {
      res.close();
    }
}

/**
 * Create a new RingoJS web application at the given path.
 * @param path the path where to create the application
 */
function createApplication(path, options) {
    if (!path) {
        throw new Error("No destination path given");
    }

    var home = engine.properties["ringo.home"];
    var war = new Path(path);
    var isDir = path.lastIndexOf('.') <= path.lastIndexOf('/');
    var dest = isDir ? path : path.substr(0, path.lastIndexOf('.'));
  
    copyTree(home, "apps/" + (options.appengine ? "appengine" : "webapp"), dest);

    copyTree(".", "", join(dest, "WEB-INF", "app"));
    copyTree(home, "modules", join(dest, "WEB-INF", "modules"));
    // uncomment this line if /lib is removed from webapp
    //makeDirectory(join(dest, "WEB-INF", "lib"));
    fixWebappDirs(dest);
    copyJars(home, dest);
    // native alternative
    //run("zip -r " + war + " .", dest);
    
    if(!isDir) {
      zip(dest, war);
      // removeTree(dest);
      print("***** " + dest);
    }
}

function copyTree(home, from, to) {
    var source = new Path(home, from);
    if (!source.exists() || !source.isDirectory()) {
        throw new Error("Can't find directory " + source);
    }
    source.copyTree(to);
}

function fixWebappDirs(dest) {
    var webinf = join(dest, "WEB-INF");
    makeDirectory(join(webinf, "classes"));
    makeDirectory(join(webinf, "packages"));
    var staticDir = join(webinf, "app", "static");
    if (exists(staticDir)) {
        move(staticDir, join(dest, "static"));
    }
}

function copyJars(home, dest) {
    var jars = [
        "ringo.jar",
        "js.jar",
        "slf4j/slf4j-api-1.5.10.jar"
    ];
    var libsrc = join(home, "lib");
    var libdest = join(dest, "WEB-INF", "lib");
    for each (var jar in jars) {
      copy(join(libsrc, jar), join(libdest, base(jar)));
    }
}

/**
 * Create a new RingoJS web application from the command line.
 * @param args
 */
function main(args) {
    var script = args.shift();
    var parser = new Parser();
    parser.addOption("a", "appengine", null, "Add AppEngine specific files");
    parser.addOption("h", "help", null, "Print help message and exit");
    var opts = parser.parse(args);
    if (opts.help) {
        print("Packages an existing RingoJS application as a web application archive (WAR)");
        print("Usage:");
        print("  ringo " + script + " [path of webapp dir or WAR file]");
        print("Options:");
        print(parser.help());
        return;
    }

    var path = args[0]
            || shell.readln("Please enter the path for your WAR or webapp dir: ");

    if (!path) {
        print("No path, exiting.");
    } else if (opts.package) {
        createPackage(path, opts);
    } else {
        createApplication(path, opts);
    }
}

if (require.main == module.id) {
    try {
        main(system.args);
    } catch (error) {
        print(error);
        print("Use -h or --help to get a list of available options.");
    }
}
