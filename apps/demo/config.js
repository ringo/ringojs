var httpConfig = {
  staticDir: 'static'
};

var urls = [
    [ /^$/, 'main.index' ],
    [ /^skins$/, 'main.skins' ],
    [ /^mount\/point/, 'webmodule.index' ],
    [ /^continuation/, 'main.continuation' ],
    [ /^logging/, 'main.logging' ],
];

var middleware = [
    'helma.webapp.continuation',
];

var charset = 'utf8';
var contentType = 'text/html';