exports.httpConfig = {
  staticDir: './static'
};

exports.scriptRepositories = require.paths;
// you can use an array or object to define script repositories for jsdoc:
/* exports.scriptRepositories = {
    stable: "/home/hannes/git/ringojs-main/modules",
    unstable: "/home/hannes/git/ringojs/modules"
}; */

exports.urls = [
    [ /([^/]+)\/(.+)/, './actions', 'module' ],
    [ /([^/]+)/, './actions', 'repository' ],
    [ /^/, './actions', 'index' ]
];

// the middleware stack
exports.middleware = [
    'ringo/middleware/gzip',
    'ringo/middleware/etag',
    'ringo/middleware/responselog',
    'ringo/middleware/error',
    'ringo/middleware/notfound',
    // 'ringo/middleware/profiler'
];

// the JSGI app
exports.app = require('ringo/webapp').handleRequest;

exports.macros = [
    require('./helpers'),
    'ringo/skin/macros',
    'ringo/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
