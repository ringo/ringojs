importModule("helma.app", "app");
importModule("helma.rhino", "rhino");
importModule("helma.shell", "shell");

// main method called to start application
function main() {
    app.start({ staticDir: 'static' });

    [
      "modules.testing.unittest_test",
      "modules.core.array_test"
    ].forEach(function(modulePath) {
       importModule(modulePath, "test");
       test.run().write(shell);
    })
    
    app.stop();
}
