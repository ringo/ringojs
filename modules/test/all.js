var {TestSuite} = require("helma.unittest");

function run() {
    var suite = new TestSuite("Helma Testsuite");
    suite.addTest("test.core.array_test");
    suite.addTest("test.core.object_test");
    suite.addTest("test.helma.file_test");
    suite.addTest("test.helma.unittest_test");
    suite.addTest("test.helma.skin_test");
    suite.run();
}

if (__name__ == "__main__") {
    run();
}
