
include('helma/unittest');
include('helma/engine');
var fs = require('file');

[
    'absolute',
    'cyclic',
    'exactExports',
    'hasOwnProperty',
    'method',
    'missing',
    'monkeys',
    'nested',
    'reflexive',
    'relative',
    'transitive',
    'determinism'
].forEach(function (testName) {
    exports['test ' + testName] = function () {
        var prefix = fs.resolve(module.path, testName);
        var done;

        var print = function (message) {
            assertFalse(/^FAIL/.test(message));
            if (/^ERROR/.test(message))
                throw new Error(message);
            if (/^DONE/.test(message))
                done = true;
        };

        var sys = Object.create(system, {
            print: { value: print }
        });

        var sandbox = createSandbox(
            [prefix], // module path
            {sys: sys}, // globals
            {includeSystemModules: true} // options
        );

        sandbox.runScript('program.js');
        assertTrue(done, 'done');
    };
});

if (module.id == require.main) {
    run(exports);
}