require('core/string');
require('core/array');
include('hashp');

export('handleRequest');

/**
 * Middleware for conditional HTTP GET request based on
 * response body message digests.
 * @param req the HTTP request
 * @return the HTTP response object
 */
function handleRequest(req) {
    var etags, digest;
    var header = req.getHeader("If-None-Match");
    if (header) {
        etags = header.split(",").map(function(s) s.trim());
    }
    var res = req.process();
    var [status, headers, body] = res;
    if (status === 200 && typeof body.digest === "function") {
        digest = '"' + body.digest() + '"';
        headers["ETag"] = digest;
        if (etags && etags.contains(digest)) {
            // return not-modified response
            HashP.unset(headers, 'Content-Length');
            return [304, headers, []];
        }
    }
    return res;
}