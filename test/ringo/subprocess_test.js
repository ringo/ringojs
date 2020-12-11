const assert = require("assert");
const subprocess = require("ringo/subprocess");

const OS_NAME = java.lang.System.getProperty("os.name").toLowerCase();
const BASH = (() => {
    return ["linux", "mac os", "solaris", "hp-ux"].some((candidate) => {
        return OS_NAME.indexOf(candidate) >= 0;
    });
})();

const CMD = (() => OS_NAME.indexOf("windows") >= 0)();

if (CMD === BASH) {
    throw new Error("Windows and Linux / Unix detected at the same time!");
}

const bashTests = {
    testCommand: () => {
        const path = subprocess.command("/bin/bash", "-c", "echo $PATH");
        assert.isTrue(path.indexOf("/bin") >= 0);
    },
    testStatus: () => {
        const status = subprocess.status("/bin/bash", "-c", "echo $PATH");
        assert.isTrue(status === 0);
    },
    testSystem: () => {
        const oldOut = java.lang.System.out;
        const baos = new java.io.ByteArrayOutputStream(1024);
        const ps = new java.io.PrintStream(baos);
        java.lang.System.setOut(ps);

        let status = -1;
        try {
            status = subprocess.system("/bin/bash", "-c", "echo $PATH");
        } finally {
            java.lang.System.setOut(oldOut);
        }

        const cs = java.nio.charset.Charset.defaultCharset();
        const path = baos.toString(cs.name());

        assert.isTrue(path.indexOf("/bin") >= 0);
        assert.isTrue(status === 0);
    }
};

const cmdTests = {
    testCommand: () => {
        const path = subprocess.command("cmd", "/C", "ver");
        assert.isTrue(path.indexOf("Microsoft Windows") >= 0);
    },
    testStatus: () => {
        const status = subprocess.status("cmd", "/C", "ver");
        assert.isTrue(status === 0);
    },
    testSystem: () => {
        const oldOut = java.lang.System.out;
        const baos = new java.io.ByteArrayOutputStream(1024);
        const ps = new java.io.PrintStream(baos);
        java.lang.System.setOut(ps);

        let status = -1;
        try {
            status = subprocess.system("cmd", "/C", "ver");
        } finally {
            java.lang.System.setOut(oldOut);
        }

        const cs = java.nio.charset.Charset.defaultCharset();
        const path = baos.toString(cs.name());

        assert.isTrue(path.indexOf("Microsoft Windows") >= 0);
        assert.isTrue(status === 0);
    }
};

if (BASH === true) {
    Object.keys(bashTests).forEach(key => exports[key] = bashTests[key]);
} else if (CMD  === true) {
    Object.keys(cmdTests).forEach(key => exports[key] = cmdTests[key]);
}

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
