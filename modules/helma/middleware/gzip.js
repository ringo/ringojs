include('hashp');
include('binary');
importClass(java.io.ByteArrayOutputStream);
importClass(java.util.zip.GZIPOutputStream);

export('handleRequest');

/**
 * Middleware for GZIP compression.
 * @param req the HTTP request
 * @return the HTTP response object
 */
function handleRequest(req) {
    var res = req.process();
    var [status, headers, body] = res;
    if (canCompress(status,
            req.getHeader("accept-encoding"),
            HashP.get(headers, 'content-type'),
            HashP.get(headers, 'content-encoding'))) {
        var bytes = new ByteArrayOutputStream();
        var gzip = new GZIPOutputStream(bytes);
        body.forEach(function(block) {
            gzip.write(block.toByteArray());
        });
        gzip.close();
        body = new ByteArray(bytes.toByteArray());
        res[2] = [body]; 
        HashP.set(headers, 'Content-Length', body.length)
        HashP.set(headers, 'Content-Encoding', 'gzip');
    }
    return res;
}

function canCompress(status, acceptEncoding, contentType, contentEncoding) {
    return status == 200 && acceptEncoding
            && acceptEncoding.indexOf('gzip') > -1
            && contentType && contentType.match(/^text|xml|json|javascript/)
            && contentEncoding != 'gzip';
}