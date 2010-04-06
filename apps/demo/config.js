var {resolve} = require('fs');

exports.httpConfig = {
    staticDir: './static'
};

exports.urls = [
    [ '/mount/point', './webmodule' ],
    [ '/storage', resolve(module.path, '../storage/config') ],
    [ '/', './actions' ]
];

exports.middleware = [
    'ringo/middleware/gzip',
    'ringo/middleware/etag',
    'ringo/middleware/responselog',
    'ringo/middleware/error',
    'ringo/middleware/notfound'
    // 'ringo/middleware/profiler'
];

// the JSGI app
exports.app = require('ringo/webapp').handleRequest;

exports.macros = [
    './helpers',
    'ringo/skin/macros',
    'ringo/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
