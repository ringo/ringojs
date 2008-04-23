Helma NG
========

This is a very early and feature incomplete preview release of Helma NG,
a Javascript application server written in Java. "NG" stands for "next
generation", meaning that it is a more of a rewrite of Helma 1 than
simply a new version.

at this point, the package consists of two interesting tools:

  1) The Helma shell
  2) The Helma application server

Helma shell
===========

To start the Helma shell run the following command in a shell window:

    java -jar shell.jar

This starts an interactive session with the Helma Javascript environment.
In addition to standard Javascript functionality, some useful functions
helma adds are:

importModule(module);
importModuleAs(module, namespace)
importFromModule(module, func1, func2, ...)

    These functions load Javascript modules and add them to the current scope.
    see http://dev.helma.org/wiki/Modules+and+Scopes+in+Helma+NG/ for more info.

    Helma first tries to resolve the path relative to the location of the
    module calling this method. If that fails, it looks for the resource
    in the repository path, which usually consists of the current directory
    (shell) or app directory (web apps) and the modules directory.

    The module path can be set using the helma.modulepath property:

        java -Dhelma.modulepath=myapp,mylibs,modules -jar shell.jar

importJar(jarfile)

    This function adds a jar (Java archive) to the classpath. by default,
    all jar files in the lib directory are included in the classpath. You
    can add also other jar files by starting helma with

       java -Dhelma.classpath=foo.jar,lib0/,lib1/*,lib2/** -jar shell.jar

getResource(path)

    This loads a resource object. See the importModule functions above for a
    detailed explanation of helma.modulepath and resource lookup.

Helma application server
========================

To start the helma web app server run the following command in a shell window:

    java -jar server.jar demo/

This starts and serves the demo web app on port 8080:

    http://localhost:8080/

Most of the web framework is missing from helma at this point, most notably
a persistence layer. What is there is a minimalist web module called
helma.simpleweb that implements url routing and skin rendering similar to the
way Helma 1 does.

The missing features will be added over time. The exciting thing is that
it will be possible to implement much of it in Javascript, meaning you can
help doing so without hacking on helma core. The new modular concept will
even allow to use helma with several frameworks, even on the same server
instance.

Helma uses Jetty for web serving. The configuration template for jetty is
etc/jetty.xml. You can edit this file to customize Jetty.

Building Helma
==============

To build helma yourself follow these steps:

  Check out helma from subversion:

      svn co http://hopdev.helma.org/svn/helma/trunk/ helma2

  Change to the helma2 directory and run ant to compile:

      ant jar

If this succeeds you should be able to start the helma shell and web server
as described above.