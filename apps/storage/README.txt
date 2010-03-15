This is a demo app for the unified storage API in RingoJS.

If run on Google App Engine the app will use the Google's Datastore binding
defined in the ringo/storage/googlestore module. See
http://ringojs.org/wiki/Screencasts/ for a short screencast on on how to run
RingoJS applications on Google App Engine.

Otherwise, the app will use ringo/storage/filestore as database backend, a
simple file based persistence engine that uses JSON as its data format.

