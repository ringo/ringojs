exports.httpConfig = {
  staticDir: 'static'
};

exports.urls = [
    [ /^mount\/point/, 'webmodule' ],
    [ /^/, 'actions' ],
];

exports.middleware = [
    'helma/webapp/continuation',
    // 'helma/profiler',
    'helma/logging',
];

exports.charset = 'utf8';
exports.contentType = 'text/html';
