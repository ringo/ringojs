RingoJS
=======

RingoJS is a JavaScript runtime written in Java based on Mozilla Rhino.

It adds a number of features to Rhino that make it suitable for real-world,
large-scale application development:

  * A fast, auto-reloading, and CommonJS-compliant module loader.
  * A rich set of modules covering I/O, logging, persistence, development tools
    and much more.
  * Scalable HTTP server based on the Jetty project.
  * Support for CommonJS packages to install or write additional software
    components.

For more information, visit the RingoJS web site: <http://ringojs.org/>

Building RingoJS
----------------

Ringo requires a recent version of [Java]. It uses Apache [Ant] as build tool
and [Ivy] for managing dependencies.

[Java]: http://www.oracle.com/technetwork/java/javase/downloads/index.html
[Ant]: http://ant.apache.org/
[Ivy]: http://ant.apache.org/ivy/

If you have these installed, building Ringo is straightforward:

Check out Ringo using Git:

    git clone git://github.com/ringo/ringojs.git

Change to the ringojs directory and run the ant `update` task to fetch
dependencies:

    ant update

Then run the `jar` task to compile the code and build the jar file:

    ant jar

Run the `docs` task to build the documentation:

    ant docs

Running RingoJS
---------------

It is recommended but not strictly required to add the ringojs bin directory to
your PATH environment variable. If you don't you'll have to type the full path
to the bin/ringo command in the examples below.

To start the Ringo shell, just run the ringo command without any arguments:

    ringo

To run a script simply pass it to ringo on the command line. For example,
to run the Ringo test suite:

    ringo test/all.js

Use the ringo-admin command to create a new web application or install
packages. To create a blank Ringo web app:

    ringo-admin create [appdir]

To install a package from a zip URL:

    ringo-admin install [packageurl]

Learning more
-------------

If you have questions visit <http://ringojs.org/> or join the RingoJS mailing
list at <http://groups.google.com/group/ringojs>.
