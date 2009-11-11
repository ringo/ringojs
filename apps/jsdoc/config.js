exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ '/(.*)', require('./actions') ]
];

// the middleware stack
exports.middleware = [
    'helma/middleware/etag',
    'helma/middleware/responselog',
    // 'helma/middleware/profiler'
];

// the JSGI app
exports.app = require('helma/webapp').handleRequest;

exports.macros = [
    'helma/skin/macros',
    'helma/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
