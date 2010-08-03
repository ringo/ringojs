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
    [ /([^/]+)\/(.+)/, require('./actions').module ],
    [ /([^/]+)/, require('./actions').repository ],
    [ /^/, require('./actions').index ]
];

// the middleware stack
exports.middleware = [
    require('ringo/middleware/gzip').middleware,
    require('ringo/middleware/etag').middleware,
    require('ringo/middleware/responselog').middleware,
    require('ringo/middleware/error').middleware,
    require('ringo/middleware/notfound').middleware
];

// the JSGI app
exports.app = require('ringo/webapp').handleRequest;

exports.macros = [
    require('./helpers'),
    require('ringo/skin/macros'),
    require('ringo/skin/filters')
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
