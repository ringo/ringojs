helma.simpleweb demo application
================================

helma.simpleweb is a simple web framework that handles requests in a way
similar to helma 1.

how to run
==========

issue the following command in the helma install directory:

  java -jar server.jar demo/

then point your browser to this url:

  http://localhost:8080/

how to use helma.simpleweb
==========================

  1) create an application directory

  2) create a file called main.js

  3) add the following line to main.js:

        importFromModule('helma.simpleweb', 'handleRequest');

     this imports the function handleRequest from the simpleweb module.

  4) Implement any number of functions with names ending with '_action'.
     These will be callable via web urls, with the '_action' suffix removed.
     For example, function foo_action will be mounted as /foo. If a url
     contains no action, simpleweb looks for an action called main_action.

  5) If you want, import other modules that contain action functions.

there you have it, modular web serving with javascript!
