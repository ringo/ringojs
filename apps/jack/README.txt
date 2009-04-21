This is a minimal script to run a Jack applications in Helma NG.

You need the the Jack package from http://github.com/tlrobinson/jack/tree/master

  git clone git://github.com/tlrobinson/jack.git

Then add the jack/lib directory to the Helma NG module path:

  export HELMA_MODULE_PATH=/path/to/jack/lib/

Alternatively, you can just copy the contents of jack/lib into Helma NG's
modules directory.

Finally, to start the app from the Helma NG directory:

  java -jar run.jar apps/jack/main.js

You should be able to access the demo app on http://localhost:8080/
