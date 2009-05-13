exports.urls = [
    [ '/', 'main' ]
];

exports.middleware = [
    'helma/logging'
];

exports.macros = [
    'helma/skin/macros',
    'helma/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
