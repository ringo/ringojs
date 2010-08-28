
var arrays = require('ringo/utils/arrays');
var strings = require('ringo/utils/strings');
var {ByteArray, ByteString} = require('binary');
var {getMimeParameter} = require('./util');
var {mergeParameter} = require('./parameters');
var {createTempFile} = require('ringo/utils/files');
var {open} = require('fs');
var {MemoryStream} = require('io');

export('isFileUpload', 'parseFileUpload', 'BufferFactory', 'TempFileFactory');

var log = require('ringo/logging').getLogger(module.id);

var HYPHEN  = "-".charCodeAt(0);
var CR = "\r".charCodeAt(0);
var CRLF = new ByteString("\r\n", "ASCII");
var EMPTY_LINE = new ByteString("\r\n\r\n", "ASCII");

/**
 * Find out whether the content type denotes a format this module can parse.
 * @param contentType a HTTP request Content-Type header
 * @return true if the content type can be parsed as form data by this module
 */
function isFileUpload(contentType) {
    return contentType && strings.startsWith(
            String(contentType).toLowerCase(), "multipart/form-data");
}


/**
 * Parses a multipart MIME input stream.
 * Parses a multipart MIME input stream.
* @param request the JSGI request object
* @param params the parameter object to parse into
* @param encoding the encoding to apply to non-file parameters
* @param streamFactory factory function to create streams for mime parts
*/
function parseFileUpload(request, params, encoding, streamFactory) {
    encoding = encoding || "UTF-8";
    streamFactory = streamFactory || BufferFactory;
    var boundary = getMimeParameter(request.headers["content-type"], "boundary");
    if (!boundary) {
        return;
    }
    boundary = new ByteArray("--" + boundary, "ASCII");
    var input = request.input;
    var buflen = 8192;
    var refillThreshold = 1024; // minimum fill to start parsing
    var buffer = new ByteArray(buflen); // input buffer
    var data;  // data object for current mime part properties
    var stream; // stream to write current mime part to
    var eof = false;
    // the central variables for managing the buffer:
    // current position and end of read bytes
    var position = 0, limit = 0;

    var refill = function(waitForMore) {
        if (position > 0) {
            // "compact" buffer
            if (position < limit) {
                buffer.copy(position, limit, buffer, 0);
                limit -= position;
                position = 0;
            } else {
                position = limit = 0;
            }
        }
        // read into buffer starting at limit
        var totalRead = 0;
        do {
            var read = input.readInto(buffer, limit, buffer.length);
            if (read > -1) {
                totalRead += read;
                limit += read;
            } else {
                eof = true;
            }
        } while (waitForMore && !eof && limit < buffer.length);
        return totalRead;
    };

    refill();

    while (position < limit) {
        if (!data) {
            // refill buffer if we don't have enough fresh bytes
            if (!eof && limit - position < refillThreshold) {
                refill(true);
            }
            var boundaryPos = buffer.indexOf(boundary, position, limit);
            if (boundaryPos < 0) {
                throw new Error("boundary not found in multipart stream");
            }
            // move position past boundary to beginning of multipart headers
            position = boundaryPos + boundary.length + CRLF.length;
            if (buffer[position - 2] == HYPHEN && buffer[position - 1] == HYPHEN) {
                // reached final boundary
                break;
            }
            var b = buffer.indexOf(EMPTY_LINE, position, limit);
            if (b < 0) {
                throw new Error("could not parse headers");
            }
            data = {};
            var headers = [];
            buffer.slice(position, b).split(CRLF).forEach(function(line) {
                line = line.decodeToString(encoding);
                // unfold multiline headers
                if ((strings.startsWith(line, " ") || strings.startsWith(line, "\t")) && headers.length) {
                    arrays.peek(headers) += line;
                } else {
                    headers.push(line);
                }
            });
            for each (var header in headers) {
                if (strings.startsWith(header.toLowerCase(), "content-disposition:")) {
                    data.name = getMimeParameter(header, "name");
                    data.filename = getMimeParameter(header, "filename");
                } else if (strings.startsWith(header.toLowerCase(), "content-type:")) {
                    data.contentType = header.substring(13).trim();
                }
            }
            // move position after the empty line that separates headers from body
            position = b + EMPTY_LINE.length;
            // create stream for mime part
            stream = streamFactory(data, encoding);
        }
        boundaryPos = buffer.indexOf(boundary, position, limit);
        if (boundaryPos < 0) {
            // no terminating boundary found, slurp bytes and check for
            // partial boundary at buffer end which we know starts with "\r\n--"
            // but we just check for \r to keep it simple.
            var cr = buffer.indexOf(CR, Math.max(position, limit - boundary.length - 2), limit);
            var end =  (cr < 0) ? limit : cr;
            stream.write(buffer, position, end);
            // stream.flush();
            position = end;
            if (!eof) {
                refill();
            }
        } else {
            // found terminating boundary, complete data and merge into parameters
            stream.write(buffer, position, boundaryPos - 2);
            stream.close();
            position = boundaryPos;
            if (typeof data.value === "string") {
                mergeParameter(params, data.name, data.value);
            } else {
                mergeParameter(params, data.name, data);
            }
            data = stream = null;
        }
    }
}

/**
 * A stream factory that stores file upload in a memory buffer. This
 * function is not meant to be called directly but to be passed as streamFactory
 * argument to [parseFileUpload()](#parseFileUpload).
 *
 * The buffer is stored in the `value` property of the parameter's data object.
 */
function BufferFactory(data, encoding) {
    var isFile = data.filename != null;
    var stream = new MemoryStream();
    var close = stream.close;
    // overwrite stream.close to set the part's content in data
    stream.close = function() {
        close.apply(stream);
        // set value property to binary for file uploads, string for form data
        if (isFile) {
            data.value = stream.content;
        } else {
            data.value = stream.content.decodeToString(encoding);
        }
    };
    return stream;
}

/**
 * A stream factory that stores file uploads in temporary files. This
 * function is not meant to be called directly but to be passed as streamFactory
 * argument to [parseFileUpload()](#parseFileUpload).
 *
 * The name of the temporary file is stored in the `tempfile` property
 * of the parameter's data object.
 */
function TempFileFactory(data, encoding) {
    if (data.filename == null) {
        // use in-memory streams for form data
        return memoryStreamFactory(data, encoding)
    }
    data.tempfile = createTempFile("ringo-upload-");
    return open(data.tempfile, {write: true, binary: true});
}
