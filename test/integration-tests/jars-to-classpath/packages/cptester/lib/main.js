exports.printFoo = function() {
   return "Static method: " + Packages.foo.bar.test.ClasspathTest.returnFoo();
};

exports.printBar = function() {
   var cp = new Packages.foo.bar.test.ClasspathTest();
   return "Public method: " + cp.returnBar();
};