
var Response = require('ringo/webapp/response').Response;

module.shared = true;

/**
 * Standard 404 page
 */
exports.middleware = function(app) {
    return function(env) {
        try {
            return app(env);
        } catch (e if e.notfound) {
            var res = new Response();
            var msg = 'Not Found';
            res.status = 404;
            res.contentType = 'text/html';
            res.writeln('<html><title>', msg, '</title>');
            res.writeln('<body><h2>', msg, '</h2>');
            var path = env.SCRIPT_NAME + env.PATH_INFO;
            res.writeln('<p>The requested URL', path, 'was not found on the server.</p>');
            res.writeln('</body></html>');
            return res.close();
        }
    };
};