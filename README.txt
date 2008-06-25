Helma NG
========

This is the README file for the 0.2 release of Helma NG, a Javascript
runtime and web application framework written in Java. "NG" stands for
"next generation", meaning that it is a more of a rewrite of Helma 1 than
simply a new version.

Helma NG consists of several parts:

  1) The Helma Shell
  2) The Helma Runtime
  3) The Helma Web Framework

Helma Shell
===========

To start the Helma shell run the following command in a shell window:

    java -jar shell.jar

This starts the Helma shell with the current directory in its module path.
The module path is the list of places Helma looks for scripts when asked to
import something. It should contain your application directory. Helma always
adds the modules directory to the end of the module path.

You can also specify one or more script directories in the command line that
will be added to the shell's module path:

    java -jar shell.jar demo/

You can also pass a script file. The file will be immediately evaluated before
entering shell mode, and its containing directory will be added to the module
path.

Helma Runtime
=============

The command line syntax for the Helma Runtime is similar to that of the Shell,
except that you use run.jar instead of shell.jar. If you pass a Javascript file
as first argument, Helma will evaluate the file and try to invoke function main()
on it.

    java -jar run.jar somepath/mainfile.js

If you pass a directory instead of a string file, Helma will look for a file
called "main.js" in the given directory and use that as main script file.

You can also add any number of additional script directories on the command line
that will be added to the Helma module path.

Helma Web Framework
===================

The Helma Web Framework is a web application framework written mostly in JavaScript
built on top of the Helma Runtime.

To run the demo application that is part of Helma NG run the following command:

    java -jar run.jar demo/main.js

This starts and serves the demo web app on port 8080:

    http://localhost:8080/

The demo app showcases a number of tools and libraries to build web apps.
As Helma NG is still pretty young, many features found in Helma 1.6 are still
missing, most notably a persistence layer. These features are currently being
implemented.

The exciting thing is thatit will be possible to implement much of it in
Javascript, meaning you can help doing so without hacking on helma core.
The new modular concept will even allow to use helma with several frameworks,
even on the same server instance.

Visit http://dev.helma.org/ng/ and join the Helma NG mailing list to keep up
with Helma NG core and module development! 

Global Functions
================

In addition to standard Javascript functionality, some useful functions
Helma adds are:

importModule(module);
importModule(module, as);
importFromModule(module, func1, ...)

    These functions load Javascript modules and add them to the current scope.
    see http://dev.helma.org/ng/Modules+and+Scopes/ for more info.

    Helma first tries to resolve the path relative to the location of the
    module calling this method. If that fails, it looks for the resource
    in the repository path, which usually consists of the current directory
    (shell) or app directory (web apps) and the modules directory.

    The module path can be set by passing one or more script directories on
    the command line. As a fallback, Helma checks the helma.modulepath
    System property:

        java -Dhelma.modulepath=myapp,mylibs,modules -jar shell.jar

importJar(jarfile)

    This function adds a jar (Java archive) to the classpath. by default,
    all jar files in the lib directory are included in the classpath. You
    can add also other jar files by starting helma with

       java -Dhelma.classpath=foo.jar,lib0/,lib1/*,lib2/** -jar shell.jar

getResource(path)

    This loads a resource object. See the importModule functions above for a
    detailed explanation of helma.modulepath and resource lookup.

Building Helma
==============

To build helma yourself follow these steps:

  Check out helma from subversion:

      svn co https://dev.helma.org/svn/helma-ng/trunk/ helma-ng

  Change to the helma-ng directory and run ant to compile:

      ant jar

If this succeeds you should be able to start the helma shell and runtime
as described above.