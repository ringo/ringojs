exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ '/mount/point', 'webmodule' ],
    [ '/storage', 'storage/config' ],
    [ '/', 'actions' ],
];

exports.middleware = [
    'helma/webapp/continuation',
    'helma/logging',
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';
