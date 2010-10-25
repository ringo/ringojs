
exports.urls = [
    [ '/mount/point', './webmodule' ],
    [ '/storage', module.resolve('../storage/config') ],
    [ '/', './actions' ]
];

exports.middleware = [
    require('ringo/middleware/gzip').middleware,
    require('ringo/middleware/etag').middleware,
    require('ringo/middleware/static').middleware(module.resolve("public")),
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
