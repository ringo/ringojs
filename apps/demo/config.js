var httpConfig = {
  staticDir: 'static'
};

var urls = [
    [ /^mount\/point/, 'webmodule' ],
    [ /^/, 'actions' ],
];

var middleware = [
    'helma.webapp.continuation',
    'helma.logging'
];

var charset = 'utf8';
var contentType = 'text/html';