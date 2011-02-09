/**
 * @fileOverview This module provides support for fully asynchronous, streaming
 * HTTP responses. Asynchronous responses can be handled by the original thread
 * handling a HTTP request, or any other thread. Note that streaming async responses
 * are not JSGI compatible and therefore not passed through the JSGI middleware stack.
 */

var {Binary} = require('binary');
var {writeHeaders} = require('ringo/jsgi');

export('AsyncResponse');

/**
 * Creates a streaming asynchronous response. The returned response object can be used
 * both synchronously from the current thread or asynchronously from another thread,
 * even after the original thread has finished execution. AsyncResponse objects are
 * threadsafe.
 * @param {Object} request the JSGI request object
 * @param {Number} timeout the response timeout in milliseconds. Defaults to 30 seconds.
 * @param {Boolean} autoflush whether to flush after each write.
 */
function AsyncResponse(request, timeout, autoflush) {
    var req = request.env.servletRequest;
    var res = request.env.servletResponse;
    var state = 0; // 1: headers written, 2: closed
    var continuation;
    return {
        /**
         * Set the HTTP status code and headers of the response. This method must only
         * be called once.
         * @param {Number} status the HTTP status code
         * @param {Object} headers the headers
         * @returns this response object for chaining
         * @name AsyncResponse.prototype.start
         */
        start: sync(function(status, headers) {
            if (state > 0) {
                throw new Error("start() must only be called once");
            }
            state = 1;
            if (continuation) {
                res = continuation.getServletResponse();
            }
            res.setStatus(status);
            writeHeaders(res, headers || {});
            return this;
        }),
        /**
          * Write a chunk of data to the response stream.
          * @param {String|Binary} data a binary or string
          * @param {String} [encoding] the encoding to use
          * @returns this response object for chaining
          * @name AsyncResponse.prototype.write
          */
         write: sync(function(data, encoding) {
            if (state == 2) {
                throw new Error("Response has been closed");
            }
            state = 1;
            if (continuation) {
                res = continuation.getServletResponse();
            }
            var out = res.getOutputStream();
            data = data instanceof Binary ? data : String(data).toByteArray(encoding);
            out.write(data);
            if (autoflush) {
                out.flush();
            }
            return this;
        }),
        /**
          * Flush the response stream, causing all buffered data to be written
          * to the client.
          * @returns this response object for chaining
          * @name AsyncResponse.prototype.flush
          */
        flush: sync(function() {
            if (state == 2) {
                throw new Error("Response has been closed");
            }
            state = 1;
            if (continuation) {
                res = continuation.getServletResponse();
            }
            res.getOutputStream().flush();
            return this;
        }),
        /**
          * Close the response stream, causing all buffered data to be written
          * to the client.
          * @function
          * @name AsyncResponse.prototype.close
          */
        close: sync(function() {
            if (state == 2) {
                throw new Error("close() must only be called once");
            }
            state = 2;
            if (continuation) {
                res = continuation.getServletResponse();
            }
            res.getOutputStream().close();
            if (continuation) {
                continuation.complete();
            }
        }),
        // Used internally by ringo/jsgi
        suspend: sync(function() {
            if (state < 2) {
                var {ContinuationSupport} = org.eclipse.jetty.continuation;
                continuation = ContinuationSupport.getContinuation(req);
                continuation.setTimeout(timeout || 30000);
                continuation.suspend(res);
            }
        })
    };
};
