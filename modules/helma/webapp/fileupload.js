
require('core/string');
require('core/array');
include('binary');
include('./util');
include('./parameters');

export('isFileUpload', 'parseFileUpload');

var log = require('helma/logging').getLogger(module.id);

var HYPHEN  = "-".charCodeAt(0);
var CRLF = new ByteString("\r\n", "ASCII");
var EMPTY_LINE = new ByteString("\r\n\r\n", "ASCII");

/**
 * Find out whether the content type denotes a format this module can parse.
 * @param contentType a HTTP request Content-Type header
 * @return true if the content type can be parsed as form data by this module
 */
function isFileUpload(contentType) {
    return contentType && String(contentType)
            .toLowerCase().startsWith("multipart/form-data");
}


/**
 * Rough but working first draft of file upload support.
 * Everything's done in memory so beware of large files.
 * @param env the JSGI env object
 * @param params the parameter object to parse into
 * @param encoding the encoding to apply to non-file parameters
 */
function parseFileUpload(env, params, encoding) {
    encoding = encoding || "UTF-8";
    var boundary = getMimeParameter(env.CONTENT_TYPE, "boundary");
    if (!boundary) {
        return;
    }
    boundary = new ByteArray("--" + boundary, "ASCII");
    var body = env["jsgi.input"].read();
    var start = body.indexOf(boundary), end;
    while(start > -1) {
        start += boundary.length + 1;
        if (body[start++] == HYPHEN &&  body[start++] == HYPHEN)
            break;
        end = body.indexOf(boundary, start);
        if (end < 0)
            break;
        var part = body.slice(start, end - 2);
        var delim = part.indexOf(EMPTY_LINE);
        if (delim > 0) {
            var data = {};
            var headers = [];
            part.slice(0, delim).split(CRLF).forEach(function(line) {
                line = line.decodeToString("ASCII");
                // unfold multiline headers
                if ((line.startsWith(" ") || line.startsWith("\t")) && headers.length) {
                    headers.peek() += line; 
                } else {
                    headers.push(line);
                }
            });
            for each (header in headers) {
                if (header.toLowerCase().startsWith("content-disposition:")) {
                    data.name = getMimeParameter(header, "name");
                    data.filename = getMimeParameter(header, "filename");
                } else if (header.toLowerCase().startsWith("content-type:")) {
                    data.contentType = header.substring(13).trim();
                }
            }
            data.value = part.slice(delim + 4);
            // use parameters.mergeParameter() to group and slice parameters
            if (data.filename) {
                mergeParameter(params, data.name, data);
            } else {
                mergeParameter(params, data.name, data.value.decodeToString(encoding));
            }
        }
        start = end;
    }
}