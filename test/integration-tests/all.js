var fs = require('fs');
var assert = require('assert');
var system = require('system');
var {createProcess, command} = require('ringo/subprocess');

const RINGO_BIN = (function () {
    var bin = 'ringo';
    var os = java.lang.System.getProperty('os.name').toLowerCase();

    if (os.indexOf('windows') >= 0) {
        bin += '.cmd';
    }

    return fs.join(module.resolve('../../bin'), bin);
})();

exports.testJarsToClasspath = function () {
    var process = createProcess({
        command: [
            RINGO_BIN,
            "-m", module.resolve('./jars-to-classpath/packages/'),
            module.resolve('./jars-to-classpath/main.js')
        ]
    });

    process.connect(null, system.stdout, system.stderr);

    // wait for the exit code
    assert.equal(process.wait(), 0);
};

const testInOut = [
    {
        in: 'console.log("Hello World");',
        out: 'Hello World'
    },
    {
        in: 'console.log(0.1 + 0.2);',
        out: '0.30000000000000004'
    },
    {
        in: 'console.log(typeof require("fs"));',
        out: 'object'
    }
];

exports.testInteractiveShell = function () {
    const stdOutVersion = command(RINGO_BIN, '--version');
    assert.equal(stdOutVersion.indexOf('RingoJS'), 0, 'ringo --version returns version number');

    const process = createProcess({
        command: [RINGO_BIN, '--silent']
    });
    const processIn = process.stdin;
    const processOut = process.stdout;
    testInOut.forEach(function (test, idx) {
        processIn
            .writeLine(test.in)
            .flush();
        // ignore terminal ESC and clear characters as well as newline at end
        // as long as what we want is printed at start of the line.
        assert.equal(processOut.readLine().indexOf(test.out), 0, 'testInOut ' + idx + ' should match');
    });
    process.kill();
};

exports.testRequireMain = require("./require-index/main").testCalculator;
exports.testHttpJsgiBinding = require("./http-jsgi-binding/simple").testHttpJsgiBinding;

// start the test runner if we're called directly from command line
if (require.main === module) {
    system.exit(require('test').run(exports));
}
