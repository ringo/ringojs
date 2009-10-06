include('binary');
include('helma/webapp/util');
importClass(java.io.ByteArrayOutputStream);
importClass(java.util.zip.GZIPOutputStream);

export('middleware');

/**
 * JSGI middleware for GZIP compression.
 * @param app the JSGI application
 * @return the wrapped JSGI app
 */
function middleware(app) {
    return function(env) {
        var res = app(env);
        var {status, headers, body} = res;
        headers = Headers(headers);
        if (canCompress(status,
                env.HTTP_ACCEPT_ENCODING,
                headers.get('Content-Type'),
                headers.get('Content-Encoding'))) {
            var bytes = new ByteArrayOutputStream();
            var gzip = new GZIPOutputStream(bytes);
            body.forEach(function(block) {
                gzip.write(block.toByteArray());
            });
            gzip.close();
            body = new ByteArray(bytes.toByteArray());
            res.body = [body];
            headers.set('Content-Length', body.length)
            headers.set('Content-Encoding', 'gzip');
        }
        return res;
    }
}

function canCompress(status, acceptEncoding, contentType, contentEncoding) {
    return status == 200 && acceptEncoding
            && acceptEncoding.indexOf('gzip') > -1
            && contentType && contentType.match(/^text|xml|json|javascript/)
            && contentEncoding != 'gzip';
}