var {TestSuite} = loadModule("helma.unittest");

function run() {
    var suite = new TestSuite("Helma Testsuite");
    suite.addTest("core.array_test");
    suite.addTest("core.object_test");
    suite.addTest("helma.file_test");
    suite.addTest("helma.unittest_test");
    suite.addTest("helma.skin_test");
    suite.run();
}

if (__name__ == "__main__") {
    run();
}
