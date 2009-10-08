exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ '/mount/point', 'webmodule' ],
    [ '/storage', 'storage/config' ],
    [ '/jsdoc', 'jsdoc/config' ],
    [ '/', 'actions' ],
];

exports.middleware = [
    'helma/middleware/gzip',
    'helma/middleware/etag',
    'helma/middleware/responselog',
    // 'helma/middleware/profiler'
];

// the JSGI app
exports.app = require('helma/webapp').handleRequest;

exports.macros = [
    'helpers',
    'helma/skin/macros',
    'helma/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
