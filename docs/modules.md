# Modules

RingoJS implements the [CommonJS Modules 1.1](http://wiki.commonjs.org/wiki/Modules/1.1)
specification.

## Anatomy of a Module

In RingoJS, every JavaScript file is treated as a module. When a module is
evaluated, it is provided with an `export` object to export functionality to
other modules and a `require` function to make use of other modules'
functionality.

As an example, `main.js` loads module `mathlib.js` in the same directory.

The contents of `main.js`:

    var mathlib = require('./mathlib');
    console.log('The square of 3 is', mathlib.square(3));

The contents of `mathlib.js`:

    exports.square = function(n) {
        return n * n;
    }

`mathlib.js` exports a function called `square` by adding it as a property of
its `exports` object.

Calling `require('./mathlib')` in `main.js` returns the `exports` object of
the `mathlib` module.

RingoJS also provides a `module` object to each module with the following
properties:

 * `id` - the canonical id of the module

 * `path` - the file path of the module resource

 * `uri` - the URL of the module resource

 * `exports` - assigning to this property allows modules to replace the
    default exports object.

Modules are executed in their own private scope. Thus, everything defined in
a module which is not explicitly exported is private to the module and invisible
to other modules.

## Module IDs

The string that identifies a module is called a module id.

The module id corresponds to the file name of the module with the `.js`
extension omitted.

Module ids starting with `'./'` or `'../'` are called relative ids. Relative ids
are looked up relative to the location of the current module following common
file system semantics.

A module id not starting with `'./'` or `'../'` is called an absolute id and is
resolved against the module path.

## The Module Path

The module path is a list of standard locations in which Ringo will look for
modules.

The module path can be set in the following ways:

 * Setting the `RINGO_MODULE_PATH` environment variable.

 * Setting the `ringo.modulepath` Java system property.

 * Using the `-m` or `--modules` option to the bin/ringo command.

 * Using the `module-path` servlet init parameter with JsgiServlet.

 * Adding or removing elements to the `require.paths` Array-like property
   from within Ringo.

Ringo versions prior to 0.8 used to put the `lib` directory of each installed
package on the module path.

Starting with version 0.8, the default module path
consists of the `modules` and `packages` directories in the ringojs installation
directory. Ringo 0.8 is also able to load modules from the Java classpath
without further configuration.

## Packages

Packages provide a means of bundling several modules and other resources into
one unit.

Packages are directories that contain a `package.json` package descriptor file.
The following `package.json` properties are recognized by Ringo's module loader:

    {
        "main": "lib/main.js"
    }

If a module id resolves directly to a package directory and `package.json`
defines a `main` property, Ringo will try to load the specified resource.
The value of the `main` property must be a path relative to the package root.

If a module id resolves to a directory that does not contain a `package.json`
file, or `package.json` does not define a `main` property, Ringo will try to
load file `index.js` in that directory.

    {
        "directories": {
            "lib": "lib"
        }
    }

If part of a module id resolves to a package directory, Ringo will try to
resolve the remaining part of the id against the `lib` directory of that
package. The location of the `lib` directory can be overridden using the
`directories.lib` property in package.json.

Ringo also provides very basic [package management] support through the
`ringo-admin` tool.

## Caching and Reloading

Modules are cached after they are loaded for the first time. Ringo tries to
resolve module ids to a canonical path in order to not load the same module
twice, but it is possible under rare circumstances that this fails and a module
is loaded twice.

By default, Ringo's module loader checks if the module or any module it depends
on has changed each time it is required. If so, the module is loaded again.

To disable module reloading run ringo with the `-p` or `--production` option,
or set the `production` servlet init parameter to `true`.
