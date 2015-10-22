include('ringo/shell');

java.lang.System.out.println(java.lang.System.getProperty("user.dir"));

var cptester = require("cptester");

if (cptester.printFoo() == "Static method: Foo" && cptester.printBar() == "Public method: Bar") {
   quit(0);
}

quit(-1);