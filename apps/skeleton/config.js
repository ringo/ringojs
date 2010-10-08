// URL routing. Using require() here to statically import modules will
// improve performance, but may cause hard to debug cyclic module dependencies
// in case any app module requires this module.
exports.urls = [
    ['/', './actions'],
];

// Middleware stack as an array of middleware factories. These will be
// wrapped around the app with the first item in the array becoming the
// outermost layer in the resulting app.
exports.middleware = [
    require('ringo/middleware/gzip').middleware,
    require('ringo/middleware/etag').middleware,
    require('ringo/middleware/static').middleware(module.resolve('public')),
    // require('ringo/middleware/responselog').middleware,
    require('ringo/middleware/error').middleware('skins/error.html'),
    require('ringo/middleware/notfound').middleware('skins/notfound.html'),
];

// The JSGI application. This is a function that takes a request object
// as argument and returns a response object.
exports.app = require('ringo/webapp').handleRequest;

// Standard skin macros and filters
exports.macros = [
    require('ringo/skin/macros'),
    require('ringo/skin/filters'),
];

// Default character encoding and MIME type for this app
exports.charset = 'UTF-8';
exports.contentType = 'text/html';
