require('core/string');
require('core/array');
include('helma/webapp/util');

export('handleRequest');

/**
 * Middleware for conditional HTTP GET request based on
 * response body message digests.
 * @param req the HTTP request
 * @return the HTTP response object
 */
function handleRequest(req) {
    var res = req.process();
    var {status, headers, body} = res;
    if (status === 200 && typeof body.digest === "function") {
        var etags;
        var header = req.getHeader("If-None-Match");
        if (header) {
            etags = header.split(",").map(function(s) s.trim());
        }
        var digest = '"' + body.digest() + '"';
        headers = HeaderMap(headers);
        headers.set("ETag", digest);
        if (etags && etags.contains(digest)) {
            // return not-modified response
            headers.unset('Content-Length');
            return {status: 304, headers: headers, body: []};
        }
    }
    return res;
}