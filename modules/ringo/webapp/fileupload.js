
require('core/string');
require('core/array');
include('binary');
include('./util');
include('./parameters');

export('isFileUpload', 'parseFileUpload');

var log = require('ringo/logging').getLogger(module.id);

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
    // the central variables for managing the buffer:
    // current position and end of read bytes
    var position = 0, end = 0;

    var refill = function() {
        if (position < end) {
            buffer.copy(position, end, buffer, 0);
            end -= position;
            position = 0;
        } else {
            position = end = 0;
        }
        // read into buffer starting at index end
        var read = input.readInto(buffer, end);
        if (read > -1) {
            end += read;
        } else {
            eof = true;
        }
        return read;
    };
    refill();
    var boundaryPos = buffer.indexOf(boundary, position, end);

    while (!eof) {
        if (!data) {
            if (boundaryPos < 0) {
                throw new Error("boundary not found in multipart stream");
            }
            // move position past boundary to beginning of multipart headers
            position = boundaryPos + boundary.length + CRLF.length;
            if (buffer[position - 2] == HYPHEN && buffer[position - 1] == HYPHEN) {
                // reached final boundary
                break;
            }
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
            position = b + EMPTY_LINE.length;
        }
        boundaryPos = buffer.indexOf(boundary, position, end);
        if (boundaryPos < 0) {
            // no terminating boundary found, slurp bytes and check for
            // partial boundary at buffer end which we know starts with "--".
            var hyphen = buffer.indexOf(HYPHEN, Math.max(position, end - boundary.length), end);
            var copyEnd =  (hyphen < 0) ? end : hyphen;
            buffer.copy(position, copyEnd, data.value, data.value.length);
            position = copyEnd;
            if (!eof) {
                refill();
            }
        } else {
            // found terminating boundary, complete data and merge into parameters
            buffer.copy(position, boundaryPos - CRLF.length, data.value, data.value.length);
            position = boundaryPos;
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