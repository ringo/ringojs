include('ringo/shell');

var cptester = require("cptester");

if (cptester.printFoo() === "Static method: Foo" && cptester.printBar() === "Public method: Bar") {
    quit(0);
} else {
    quit(-1);
}
