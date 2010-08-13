exports.httpConfig = {
  staticDir: './static'
};

// you can use an array or object to define script repositories for jsdoc
// default it will load repos from require.paths
exports.repository = {
    path: require.paths[1],
    name: "Modules"
};

// rendering the fileoverview of each module in the module list is slow
exports.detailedModuleList = true;

exports.urls = [
    [ /\/(?:index\.html)?/, './actions', 'repository' ],
    [ /\/([^/]+\/(?:[^\.]*\/)?)(?:index\.html)?/, './actions', 'module' ],
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
    './macros',
    'ringo/skin/macros',
    'ringo/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
