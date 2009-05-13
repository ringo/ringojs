This is a demo app for the unified storage API in Helma NG.

If run on Google App Engine the app will use the Google's Datastore binding
defined in the helma/storage/googlestore module.
See http://dev.helma.org/ng/Running+Rhino+and+Helma+NG+on+Google+App+Engine/
for more information on how to run Helma NG applications on Google App Engine.

Otherwise, the app will use helma/storage/filestore as database backend, a
simple file based persistence engine that uses JSON as its data format.

