/**
 * @fileOverview Low-level JSGI adapter implementation.
 */

var {Headers, getMimeParameter} = require('ringo/utils/http');
var {Stream} = require('io');
var {Binary} = require('binary');
var system = require('system');
var strings = require('ringo/utils/strings');
var {WriteListener, AsyncListener} = javax.servlet;
var {ConcurrentLinkedQueue} = java.util.concurrent;
var {EofException} = org.eclipse.jetty.io;
var {AtomicBoolean} = java.util.concurrent.atomic;

export('handleRequest', 'AsyncResponse');
var log = require('ringo/logging').getLogger(module.id);

const FLUSH = new ByteArray(0);

/**
 * Handle a JSGI request.
 * @param {String} moduleId the module id. Ignored if functionObj is already a function.
 * @param {Function|String} functionObj the function, either as function
 * object or function name to be imported from the module moduleId.
 * @param {Object} request the JSGI request object
 * @returns {Object} the JSGI response object
 */
function handleRequest(moduleId, functionObj, request) {
    initRequest(request);
    var app;
    if (typeof(functionObj) === 'function') {
        app = functionObj;
    } else {
        app = require(moduleId);
        if (typeof(app) !== 'function') {
            app = app[functionObj];
        }
        request.env.app = moduleId;
    }
    // if RINGO_ENV environment variable is set and application supports
    // modular JSGI environment feature use the proper environment
    if (app && system.env.RINGO_ENV && typeof(app.env) === 'function') {
        app = app.env(system.env.RINGO_ENV);
    }
    if (typeof(app) !== 'function') {
        throw new Error('No valid JSGI app: ' + app);
    }
    var result = app(request);
    if (!result) {
        throw new Error('No valid JSGI response: ' + result);
    }
    commitResponse(request, result);
}

/**
 * Set up the I/O related properties of a jsgi environment object.
 * @param {Object} request a jsgi request object
 */
function initRequest(request) {
    var input, errors;
    if (request.hasOwnProperty('input')) {
        // already set up, probably because the original request threw a retry
        return;
    }
    Object.defineProperty(request, "input", {
        get: function() {
            if (!input)
                input = new Stream(request.env.servletRequest.getInputStream());
            return input;
        },
        enumerable: true
    });
    Object.defineProperty(request.jsgi, "errors", {
        value: system.stderr
    });
}

/**
 * Apply the return value of a JSGI application to a servlet response.
 * This is used internally by the org.ringojs.jsgi.JsgiServlet class, so
 * you won't need this unless you're implementing your own servlet
 * based JSGI connector.
 *
 * @param {Object} req the JSGI request argument
 * @param {Object} result the object returned by a JSGI application
 */
function commitResponse(req, result) {
    var request = req.env.servletRequest;
    if (typeof request.isAsyncStarted === "function" && request.isAsyncStarted()) {
        return;
    }
    var response = req.env.servletResponse;
    var {status, headers, body} = result;
    if (!status || !headers || !body) {
        // Check if this is an asynchronous response. If not throw an Error
        throw new Error('No valid JSGI response: ' + result);
    }
    // Allow application/middleware to handle request via Servlet API
    if (!response.isCommitted() && !Headers(headers).contains("X-JSGI-Skip-Response")) {
        writeResponse(response, status, headers, body);
    }
}

function writeResponse(servletResponse, status, headers, body) {
    servletResponse.setStatus(status);
    writeHeaders(servletResponse, headers);
    var charset = getMimeParameter(headers.get("Content-Type"), "charset");
    writeBody(servletResponse, body, charset);
}

function writeHeaders(servletResponse, headers) {
    for (var key in headers) {
        var values = headers[key];
        if (typeof values === "string") {
            values = values.split("\n");
        } else if (!Array.isArray(values)) {
            continue;
        }
        values.forEach(function(value) {
            servletResponse.addHeader(key, value);
        });
    }
}

function writeBody(response, body, charset) {
    if (body && typeof body.forEach == "function") {
        var output = response.getOutputStream();
        var writer = function(part) {
            if (!(part instanceof Binary)) {
                part = part.toByteString(charset);
            }
            output.write(part);
        };
        body.forEach(writer);
        if (typeof body.close == "function") {
            body.close(writer);
        }
    } else {
        throw new Error("Response body doesn't implement forEach: " + body);
    }
}

/**
 * Creates a streaming asynchronous response. The returned response object can be used
 * both synchronously from the current thread or asynchronously from another thread,
 * even after the original thread has finished execution. AsyncResponse objects are
 * threadsafe.
 * @param {Object} request the JSGI request object
 * @param {Number} timeout the response timeout in milliseconds. Defaults to 30 seconds.
 */
function AsyncResponse(request, timeout) {
    if (!request || !request.env) {
        throw new Error("Invalid request argument: " + request);
    }
    var {servletRequest, servletResponse} = request.env;
    var asyncContext = servletRequest.startAsync();
    if (timeout != null && isFinite(timeout)) {
        asyncContext.setTimeout(timeout);
    }
    asyncContext.addListener(new AsyncListener({
        "onComplete": function(event) {
            log.debug("AsyncListener.onComplete", event);
        },
        "onError": function(event) {
            log.debug("AsyncListener.onError", event);
        },
        "onStartAsync": function(event) {
            log.debug("AsyncListener.onStartAsync", event);
        },
        "onTimeout": function(event) {
            log.debug("AsyncListener.onTimeout", event);
            event.getAsyncContext().complete();
        }
    }));

    var out = servletResponse.getOutputStream();
    var writeListener = null;
    return {
        "start": function(status, headers) {
            servletResponse.setStatus(status);
            writeHeaders(servletResponse, headers || {});
            return this;
        },
        "write": function(data, encoding) {
            if (!(data instanceof Binary)) {
                data = String(data).toByteArray(encoding);
            }
            if (writeListener === null) {
                writeListener = new WriteListenerImpl(asyncContext);
                writeListener.queue.add(data);
                out.setWriteListener(writeListener);
            } else {
                writeListener.queue.add(data);
                writeListener.onWritePossible();
            }
            return this;
        },
        "flush": function() {
            this.write(FLUSH);
        },
        "close": function() {
            if (writeListener !== null) {
                return writeListener.close();
            }
            return asyncContext.complete();
        }
    };
}

/**
 * Creates a new WriteListener instance
 * @param {javax.servlet.AsyncContext} asyncContext The async context of the request
 * @param {javax.servlet.ServletOutputStream} outStream The output stream to write to
 * @returns {javax.servlet.WriteListener}
 * @constructor
 */
var WriteListenerImpl = function(asyncContext) {
    this.isReady = new AtomicBoolean(true);
    this.isFinished = false;
    this.queue = new ConcurrentLinkedQueue();
    this.asyncContext = asyncContext;
    return new WriteListener(this);
};

/**
 * Called by the servlet container or directly. Polls all byte buffers from
 * the internal queue and writes them to the response's output stream.
 */
WriteListenerImpl.prototype.onWritePossible = function() {
    var outStream = this.asyncContext.getResponse().getOutputStream();
    if (this.isReady.compareAndSet(true, false)) {
        // Note: .isReady() schedules a call for onWritePossible
        // if it returns false
        while (outStream.isReady() && !this.queue.isEmpty()) {
            let data = this.queue.poll();
            if (data === FLUSH) {
                outStream.flush();
            } else {
                outStream.write(data, 0, data.length);
            }
            if (!outStream.isReady()) {
                this.isReady.set(true);
                return;
            }
        }
        // at this point the queue is empty: mark this listener as ready
        // and close the response if we're finished
        this.isReady.set(true);
        if (this.isFinished === true) {
            this.asyncContext.complete();
        }
    }
};

/**
 * Called on every write listener error
 * @param {java.lang.Throwable} error The error
 */
WriteListenerImpl.prototype.onError = function(error) {
    if (!(error instanceof EofException)) {
        log.error("WriteListener.onError", error);
    }
    try {
        this.asyncContext.complete();
    } catch (e) {
        // ignore, what else could we do?
    }
};

/**
 * Marks this write listener as finished and calls onWritePossible().
 * This will finish the queue and then complete the async context.
 */
WriteListenerImpl.prototype.close = function() {
    this.isFinished = true;
    this.onWritePossible();
};