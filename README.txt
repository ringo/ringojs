ATTENTION: RingoJS was formerly known as Helma NG. We are currently in the
process of renaming to RingoJS, so please bear with us while occasional "Helma"
references keep popping up.


RingoJS
=======

RingoJS is a JavaScript runtime and web application framework written in Java.
RingoJS consists of several components that can be used together or alone:

  1) A compact JavaScript runtime environment based on Mozilla Rhino. It adds
     to Rhino a reloading module system that is compatible to the CommonJS
     Securable Module proposal.

  2) An interactive shell with support for autocompletion and history.

  3) A module library implemented in JavaScript, covering basic functionality
     such as extensions to the built-in objects, file I/O, logging,
     persistence, client and server side HTTP support and more.

For more information, check out the RingoJS homepage and wiki:

    http://ringojs.org/

Building RingoJS
================

RingoJS requires Java 1.5 and uses Apache Ant as its build environment. If you
have these installed, building RingoJS is straightforward:

  Check out RingoJS from Git:

      git clone git://github.com/ringo/ringojs.git

  Change to the ringojs directory and run ant to compile:

      ant jar

If this succeeds you should now have a file called run.jar and be ready to go.

JavaScript Runtime and Shell
============================

The Ringo JavaScript runtime is based on Mozilla Rhino and supports JavaScript
1.7 with partial support for JavaScript 1.8 features.

To run RingoJS, add the ringojs/bin directory to your PATH environment
variable:

    export PATH=$PATH:/path/to/ringojs/bin

To start a shell session, just run the ringo command without any arguments:

    ringo

To run a script simply pass it to ringo on the command line:

    ringo apps/demo/main.js

If you run a script that is contained in RingoJS' module path you can also use
the simpler abstract module name instead of the file name. For example, to run
the RingoJS test suite:

    ringo test/all

To create a new web application, use the admin/create script. This will copy an
simple skeleton app to the location you define. You can pass the application
directory as command line argument, or the script will prompt you for it.

    ringo admin/create [appdir]

Run ringo with the -h or --help switch to get more information about
available command line options. For example, the -i or --interactive option
allows you to run an application and use the shell at the same time, which can
be really handy.

Module Path Setup
=================

RingoJS loads JavaScript resources using a module loader that is compliant with
the CommonJS Modules 1.0 Specification:

    http://commonjs.org/specs/modules/1.0.html

RingoJS actually goes one step further and makes sure every module has its own
top level scope, so modules are fully isolated from each other, providing a
programming environment that resembles that of Python environment more than the
one of ordinary client-side JavaScript runtime.

RingoJS uses the concept of a module path to look up and load modules that is
similar to the PATH environment variable used to find executables on most
operating systems. By default, the module path consists of two entries:

    1. The application root, which is the parent directory of the command line
       script, or the current working directory if called without script
       argument.

    2. The system modules root, which corresponds to the modules directory in
       the RingoJS home directory.

RingoJS provides several ways to access and set the module path. The simplest
is to set the RINGO_MODULE_PATH environment variable, separating multiple
entries with ':' or whatever character is used to separate PATH entries on your
system:

     export RINGO_MODULE_PATH=../foo/lib:../my/lib

Alternatively, you can define the module path using the ringo.modulepath Java
system property, and you can add entries to the module path using the
addRepository() method in the ringo/system module.

Module and Resource Loading
===========================

RingoJS provides three functions with different semantics to load modules:

require(moduleName)

    The require function provides the functionality defined in the CommonJS
    Modules proposal. It tries to locate a module in the module path, loads it
    and returns its exports object.

import(moduleName)

    The import function builds on top of require, additionally setting a
    property in the calling module scope whose name is the name of the loaded
    module and whose value is the loaded module's exports object.

include(moduleName)

    The include function builds on top of require, additionally copying all
    exported properties of the loaded module to the calling module scope.

export(propertyName[, ...])

    The export function provides an alternative method to the exports object to
    define exported properties in a module by passing the names of exported
    properties as arguments.

addToClasspath(pathName)

    This function adds a jar file or directory to the classpath. By default,
    all jar files in the RingoJS lib directory are included in the classpath.

getResource(pathName)

    This looks for a file with the given path name in the module path and
    returns a resource object. This can be used to load resources other than
    JavaScript files using the same lookup rules as the module loader.

Web Framework
=============

The RingoJS Web Framework is a web application framework written mostly in
JavaScript built on top of the RingoJS Runtime.

To run the demo application that is part of RingoJS run the following command:

    ringo apps/demo/main.js

This starts and serves the demo web app on port 8080:

    http://localhost:8080/

The demo app showcases a number of tools and libraries to build web apps. As
RingoJS is still pretty young, many features are still missing, most notably a
persistence layer. These features are currently being implemented.

The exciting thing is that it will be possible to implement much of it in
Javascript, meaning you can help doing so without hacking on RingoJS core. The
new modular concept will even allow to use RingoJS with several frameworks,
even on the same server instance.


Visit http://ringojs.org/ and join the RingoJS mailing list to keep up
with RingoJS core and module development!
