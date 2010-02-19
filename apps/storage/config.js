// shared in order not to recreate Store for each request 
module.shared = true;

var Store = require('ringo/storage/filestore').Store;
exports.store = new Store('db');

exports.urls = [
    [ '/', require('./main') ]
];

exports.middleware = [
    'ringo/middleware/transaction',
    // 'ringo/middleware/gzip',
    'ringo/middleware/etag',
    'ringo/middleware/responselog',
    // 'ringo/middleware/profiler'
];

// the JSGI app
exports.app = 'ringo/webapp';

exports.macros = [
    'ringo/skin/macros',
    'ringo/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
