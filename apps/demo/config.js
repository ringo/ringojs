exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ '/mount/point', 'webmodule' ],
    [ '/storage', 'storage/config' ],
    [ '/', 'actions' ],
];

exports.middleware = [
    'helma/middleware/gzip',
    'helma/middleware/etag',
    'helma/middleware/responselog',
    // 'helma/middleware/profiler'
];

exports.macros = [
    'macros',
    'helma/skin/macros',
    'helma/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
