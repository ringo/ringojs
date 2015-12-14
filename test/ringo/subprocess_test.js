var assert = require("assert");
var subprocess = require("ringo/subprocess");

var OS_NAME = java.lang.System.getProperty("os.name").toLowerCase();
var BASH = (function() {
    return ["linux", "mac os", "solaris", "hp-ux"].some(function(candidate) {
        return OS_NAME.indexOf(candidate) >= 0;
    });
})();

var CMD = (function() {
    return OS_NAME.indexOf("windows") >= 0;
})();

if (CMD === BASH === true) {
    throw new Error("Windows and Linux / Unix detected at the same time!");
}

var bashTests = {
    testCommand: function() {
        var path = subprocess.command("/bin/bash", "-c", "echo $PATH");
        assert.isTrue(path.indexOf("/bin") >= 0);
    },
    testStatus: function() {
        var status = subprocess.status("/bin/bash", "-c", "echo $PATH");
        assert.isTrue(status == 0);
    },
    testSystem: function() {
        var oldOut = java.lang.System.out;
        var baos = new java.io.ByteArrayOutputStream(1024);
        var ps = new java.io.PrintStream(baos);
        java.lang.System.setOut(ps);

        var status = -1;
        try {
            status = subprocess.system("/bin/bash", "-c", "echo $PATH");
        } finally {
            java.lang.System.setOut(oldOut);
        }

        var cs = java.nio.charset.Charset.defaultCharset();
        var path = baos.toString(cs.name());

        assert.isTrue(path.indexOf("/bin") >= 0);
        assert.isTrue(status == 0);
    }
};

var cmdTests = {
    testCommand: function() {
        var path = subprocess.command("cmd", "/C", "ver");
        assert.isTrue(path.indexOf("Microsoft Windows") >= 0);
    },
    testStatus: function() {
        var status = subprocess.status("cmd", "/C", "ver");
        assert.isTrue(status == 0);
    },
    testSystem: function() {
        var oldOut = java.lang.System.out;
        var baos = new java.io.ByteArrayOutputStream(1024);
        var ps = new java.io.PrintStream(baos);
        java.lang.System.setOut(ps);

        var status = -1;
        try {
            status = subprocess.system("cmd", "/C", "ver");
        } finally {
            java.lang.System.setOut(oldOut);
        }

        var cs = java.nio.charset.Charset.defaultCharset();
        var path = baos.toString(cs.name());

        assert.isTrue(path.indexOf("Microsoft Windows") >= 0);
        assert.isTrue(status == 0);
    }
};

if (BASH === true) {
    for (var testName in bashTests) {
        exports[testName] = bashTests[testName];
    }
} else if (CMD  === true) {
    for (var testName in cmdTests) {
        exports[testName] = cmdTests[testName];
    }
}

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}