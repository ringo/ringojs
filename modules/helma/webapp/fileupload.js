
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
    var input = env["jsgi.input"];
    var buflen = 8192;
    var refillThreshold = 6144;
    var buffer = new ByteArray(buflen);
    var data;
    var eof = false;
    var position = 0, end = 0;

    var refill = function() {
        if (position < end) {
            buffer.copy(position, end, buffer, 0);
            end -= position;
            position = 0;
        } else {
            position = end = 0;
        }
        var read = input.readInto(buffer, end)
        if (read > -1) {
            end += read;
        } else {
            eof = true;
        }
        return read;
    }
    refill();

    while (!eof) {
        if (!data) {
            var a = buffer.indexOf(boundary, position, end);
            if (a < 0) {
                throw new Error("boundary not found in multipart stream");
            }
            a += boundary.length;
            if (buffer[a++] == HYPHEN &&  buffer[a++] == HYPHEN) {
                break;
            }
            position = a + 1;
            var b = buffer.indexOf(EMPTY_LINE, position, end);
            if (b < 0) {
                throw new Error("could not parse headers");
            }
            data = {value: new ByteArray(0)};
            var headers = [];
            buffer.slice(position, b).split(CRLF).forEach(function(line) {
                line = line.decodeToString(encoding);
                // unfold multiline headers
                if ((line.startsWith(" ") || line.startsWith("\t")) && headers.length) {
                    headers.peek() += line;
                } else {
                    headers.push(line);
                }
            });
            for each (var header in headers) {
                if (header.toLowerCase().startsWith("content-disposition:")) {
                    data.name = getMimeParameter(header, "name");
                    data.filename = getMimeParameter(header, "filename");
                } else if (header.toLowerCase().startsWith("content-type:")) {
                    data.contentType = header.substring(13).trim();
                }
            }
            // move position after the empty line that separates headers from body
            position = b + 4;
        }
        var c = buffer.indexOf(boundary, position, end);
        // no
        if (c < 0) {
            // no terminating boundary found, slurp bytes and check for
            // partial boundary at buffer end which we know starts with "--".
            var hyphen = buffer.indexOf(HYPHEN, end - boundary.length, end);
            var copyTo =  (hyphen < 0) ? end : hyphen;
            buffer.copy(position, copyTo, data.value, data.value.length)
            position = copyTo;
            if (!eof) {
                refill();
            }
        } else {
            // found terminating boundary, complete data and merge into parameters
            buffer.copy(position, c - 2, data.value, data.value.length);
            position = c;
            if (data.filename) {
                mergeParameter(params, data.name, data);
            } else {
                mergeParameter(params, data.name, data.value.decodeToString(encoding));
            }
            data = null;
            if (position > refillThreshold && !eof) {
                refill();
            }
        }
    }
}