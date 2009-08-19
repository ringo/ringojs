// shared in order not to recreate Store for each request 
__shared__ = true;

exports.urls = [
    [ '/', 'main' ]
];

exports.middleware = [
    'helma/middleware/transaction',
    // 'helma/middleware/gzip',
    'helma/middleware/etag',
    'helma/middleware/responselog',
    // 'helma/middleware/profiler'
];

exports.macros = [
    'helma/skin/macros',
    'helma/skin/filters'
];

var Store = require('helma/storage/filestore').Store;
exports.store = new Store('db');

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
