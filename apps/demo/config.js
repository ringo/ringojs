exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ /^mount\/point/, 'webmodule' ],
    [ /^/, 'actions' ],
];

exports.middleware = [
    // 'helma/webapp/continuation',
    'helma/logging',
    'helma/profiler'
];

exports.charset = 'utf8';
exports.contentType = 'text/html';
