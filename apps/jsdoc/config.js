exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ '/(.*)', require('./actions'), 'jsdoc' ]
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
