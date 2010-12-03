// run all tests except for the rather slow httpclient ones

var all = require('./all');

for (var key in all) {
    if (key !== "testHttpclient")
        exports[key] = all[key];
}

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require('test').run(exports));
}
