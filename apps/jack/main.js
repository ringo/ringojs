var http = require('helma/httpserver');
http.start({
    port: 8080,
    moduleName: 'jack/narwhal',
    functionName: 'Narwhal'
});

// Alternatively, you can pass the jack app to start() as second argument.
// this bypasses module loading in the servlet, so changes in the Jack app won't be picked up.
// http.start({ port: 8080 }, require('jack/narwhal').Narwhal);
