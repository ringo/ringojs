importFromModule("helma.unittest", "*");

if (__name__ == "__main__") {
    var suite = new TestSuite("Helma Testsuite");
    suite.addTest("core.array_test");
    suite.addTest("helma.file_test");
    suite.addTest("helma.unittest_test");
    suite.run();
}
