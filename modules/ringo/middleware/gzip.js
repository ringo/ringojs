var {Binary, ByteArray, ByteString} = require('binary');
var {ResponseFilter, Headers} = require('ringo/webapp/util');

var {ByteArrayOutputStream} = java.io;
var {GZIPOutputStream} = java.util.zip;

export('middleware');

module.shared = true;

/**
 * JSGI middleware for GZIP compression.
 * @param app the JSGI application
 * @returns the wrapped JSGI app
 */
function middleware(app) {
    return function(env) {
        var res = app(env);
        var headers = Headers(res.headers);
        if (canCompress(res.status,
                env.HTTP_ACCEPT_ENCODING,
                headers.get('Content-Type'),
                headers.get('Content-Encoding'))) {
            var bytes = new ByteArrayOutputStream();
            var gzip = new GZIPOutputStream(bytes);
            res.body = new ResponseFilter(res.body, function(part) {
                if (!(part instanceof Binary)) {
                    part = part.toByteString();
                }
                gzip.write(part);
                if (bytes.size() > 1024) {
                    var zipped = bytes.toByteArray();
                    bytes.reset();
                    return new ByteString(zipped);
                }
                return null;
            });
            res.body.close = function(fn) {
                gzip.close();
                fn(new ByteString(bytes.toByteArray()));
            };
            // headers.set('Content-Length', res.body.length)
            headers.set('Content-Encoding', 'gzip');
        }
        return res;
    }
}

function canCompress(status, acceptEncoding, contentType, contentEncoding) {
    // currently only returns true for text/xml/json/javascript content types
    return status == 200 && acceptEncoding
            && acceptEncoding.indexOf('gzip') > -1
            && contentType && contentType.match(/^text|xml|json|javascript/)
            && contentEncoding != 'gzip';
}