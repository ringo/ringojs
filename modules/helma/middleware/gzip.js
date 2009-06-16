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
    var header = req.getHeader("accept-encoding");
    var res = req.process();
    var [status, headers, body] = res;
    if (status == 200 && header &&  header.indexOf('gzip') > -1) {
        var bytes = new ByteArrayOutputStream();
        var gzip = new GZIPOutputStream(bytes);
        body.forEach(function(block) {
            gzip.write(block.toBinary().bytes);
        });
        gzip.close();
        res[2] = body = new Binary(bytes.toByteArray());
        HashP.set(headers, 'Content-Length', body.getLength())
        HashP.set(headers, 'Content-Encoding', 'gzip');
    }
    return res;
}