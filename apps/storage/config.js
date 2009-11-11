// shared in order not to recreate Store for each request 
module.shared = true;

var Store = require('helma/storage/filestore').Store;
exports.store = new Store('db');

exports.urls = [
    [ '/', require('./main') ]
];

exports.middleware = [
    'helma/middleware/transaction',
    // 'helma/middleware/gzip',
    'helma/middleware/etag',
    'helma/middleware/responselog',
    // 'helma/middleware/profiler'
];

// the JSGI app
exports.app = 'helma/webapp';

exports.macros = [
    'helma/skin/macros',
    'helma/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
