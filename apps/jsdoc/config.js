exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ '/(.*)', require('./actions'), 'jsdoc' ]
];

// the middleware stack
exports.middleware = [
    'helma/middleware/gzip',
    'helma/middleware/etag',
    'helma/middleware/responselog',
    'helma/middleware/error',
    'helma/middleware/notfound',
    // 'helma/middleware/profiler'
];

// the JSGI app
exports.app = require('helma/webapp').handleRequest;

exports.macros = [
    require('./helpers'),
    'helma/skin/macros',
    'helma/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
