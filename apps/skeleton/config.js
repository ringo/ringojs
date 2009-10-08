exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ '/', 'actions' ]
];

exports.middleware = [
    'helma/middleware/etag',
    'helma/middleware/responselog',
    // 'helma/middleware/profiler'
];

exports.app = require('helma/webapp').handleRequest;

exports.macros = [
    'helma/skin/macros',
    'helma/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
