// to use Google app engine store replace the two lines below with:
// exports.store = require('ringo/storage/googlestore');
var Store = require('ringo/storage/filestore').Store;
exports.store = new Store('db');

exports.urls = [
    [ '/', './main' ]
];

exports.middleware = [
    'ringo/middleware/transaction',
    'ringo/middleware/gzip',
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
