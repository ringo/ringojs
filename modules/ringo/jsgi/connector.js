/**
 * @fileOverview Low-level JSGI adapter implementation.
 */

const {Headers, getMimeParameter} = require('ringo/utils/http');
const io = require('io');
const binary = require('binary');
const system = require('system');
const {WriteListener, AsyncListener} = Packages.jakarta.servlet;
const {ConcurrentLinkedQueue} = java.util.concurrent;
const {EofException} = org.eclipse.jetty.io;
const {AtomicBoolean} = java.util.concurrent.atomic;

const log = require('ringo/logging').getLogger(module.id);

const FLUSH = new binary.ByteArray(0);

/**
 * Handle a JSGI request.
 * @param {String} moduleId the module id. Ignored if functionObj is already a function.
 * @param {Function|String} functionObj the function, either as function
 * object or function name to be imported from the module moduleId.
 * @param {Object} request the JSGI request object
 * @returns {Object} the JSGI response object
 */
const handleRequest = exports.handleRequest = (moduleId, functionObj, request) => {
    initRequest(request);
    let app;
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
    const result = app(request);
    if (!result) {
        throw new Error('No valid JSGI response: ' + result);
    }
    commitResponse(request, result);
};

/**
 * Set up the I/O related properties of a jsgi environment object.
 * @param {Object} request a jsgi request object
 */
const initRequest = (request) => {
    let input;
    if (request.hasOwnProperty('input')) {
        // already set up, probably because the original request threw a retry
        return;
    }
    Object.defineProperty(request, "input", {
        get: () => {
            if (!input) {
                input = new io.Stream(request.env.servletRequest.getInputStream());
            }
            return input;
        },
        set: (stream) => {
            if (!stream instanceof io.Stream) {
               throw new Error("Input must be a Stream!");
            }
            input = stream;
        },
        enumerable: true
    });
    Object.defineProperty(request.jsgi, "errors", {
        value: system.stderr
    });
};

/**
 * Apply the return value of a JSGI application to a servlet response.
 * This is used internally by the org.ringojs.jsgi.JsgiServlet class, so
 * you won't need this unless you're implementing your own servlet
 * based JSGI connector.
 *
 * @param {Object} req the JSGI request argument
 * @param {Object} result the object returned by a JSGI application
 */
const commitResponse = (req, result) => {
    const request = req.env.servletRequest;
    if (typeof request.isAsyncStarted === "function" && request.isAsyncStarted()) {
        return;
    }
    const response = req.env.servletResponse;
    const {status, headers, body} = result;
    if (!status || !headers || !body) {
        // Check if this is an asynchronous response. If not throw an Error
        throw new Error('No valid JSGI response: ' + result);
    }
    // Allow application/middleware to handle request via Servlet API
    if (!response.isCommitted() && !Headers(headers).contains("X-JSGI-Skip-Response")) {
        writeResponse(response, status, headers, body);
    }
};

const writeResponse = (servletResponse, status, headers, body) => {
    servletResponse.setStatus(status);
    writeHeaders(servletResponse, headers);
    const charset = getMimeParameter(headers.get("Content-Type"), "charset");
    writeBody(servletResponse, body, charset);
};

const writeHeaders = (servletResponse, headers) => {
    Object.keys(headers).forEach(key => {
        let values = headers[key];
        if (typeof values === "string") {
            values = values.split("\n");
        }
        if (Array.isArray(values)) {
            values.forEach((value) => servletResponse.addHeader(key, value));
        }
    });
};

const writeBody = (response, body, charset) => {
    if (body && typeof body.forEach === "function") {
        const output = response.getOutputStream();
        const writer = (part) => {
            if (!(part instanceof binary.Binary)) {
                part = binary.toByteString(part, charset);
            }
            output.write(part);
        };
        body.forEach(writer);
        if (typeof body.close === "function") {
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
 *
 * To enable async support inside a Servlet 3.0+ container, an additional
 * <code>&lt;async-supported&gt;true&lt;/async-supported&gt;</code> element in
 * the <code>web.xml</code> deployment descriptor might be required.
 * This indicates that Ringo's JsgiServlet supports asynchronous request processing.
 *
 * @param {Object} request the JSGI request object
 * @param {Number} timeout time in milliseconds in which the async operation has to be completed;
 *                 otherwise the request is aborted by the Servlet container.
 *                 A negative value lets the async operation never time out. Defaults to 30 seconds.
 * @returns {Object} <code>AsyncResponse</code> object with helpers to control the response's <code>WriteListener</code>. Contains the following methods:
 *                   <dl>
 *                       <dt><code>start(status, headers)</code>
 *                       <dd>sends the status code and HTTP headers object, must be called before any write
 *                       <dt><code>write(data, encoding)</code>
 *                       <dd>adds the given data (instance of <code>String</code> or <code>Binary</code>) to output queue to be written back to the client
 *                       <dt><code>flush()</code>
 *                       <dd>forces any queued data to be written out
 *                       <dt><code>close()</code>
 *                       <dd>completes the async response and closes the write listener
 *                   </dl>
 *
 * @see <a href="http://download.oracle.com/otndocs/jcp/servlet-3.0-fr-oth-JSpec/">Servlet 3.0 specification - &lt;async-supported&gt;</a>
 * @example const response = new AsyncResponse(request, 10000);
 * response.start(200, {"Content-Type": "text/plain"});
 *
 * // this functions returns a ringo promise
 * doSomeAsyncStuff().then(function(data) {
 *   // write out result
 *   response.write(data);
 *   response.close();
 * }, function() {
 *   // just close the connection in case of an error
 *   response.close();
 * });
 *
 * return response;
 */
exports.AsyncResponse = function(request, timeout) {
    if (!request || !request.env) {
        throw new Error("Invalid request argument: " + request);
    }
    const {servletRequest, servletResponse} = request.env;
    const asyncContext = servletRequest.startAsync();
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

    const out = servletResponse.getOutputStream();
    const writeListener = new WriteListenerImpl(asyncContext);
    out.setWriteListener(writeListener);
    return {
        "start": function(status, headers) {
            servletResponse.setStatus(status);
            writeHeaders(servletResponse, headers || {});
            return this;
        },
        "write": function(data, encoding) {
            let servletRequestState = servletRequest.getRequest().getServletChannel().getServletRequestState();
            if (servletRequestState.isResponseCompleted()) {
                throw new Error("AsyncResponse already closed");
            }
            if (!(data instanceof binary.Binary)) {
                data = binary.toByteArray(String(data), encoding);
            }
            writeListener.queue.add(data);
            writeListener.onWritePossible();
            return this;
        },
        "flush": function() {
            this.write(FLUSH);
        },
        "close": function() {
            let servletRequestState = servletRequest.getRequest().getServletChannel().getServletRequestState();
            if (servletRequestState.isResponseCompleted()) {
                throw new Error("AsyncResponse already closed");
            }
            return writeListener.close();
        }
    };
}

/**
 * Creates a new WriteListener instance
 * @param {jakarta.servlet.AsyncContext} asyncContext The async context of the request
 * @param {jakarta.servlet.ServletOutputStream} outStream The output stream to write to
 * @returns {jakarta.servlet.WriteListener}
 * @constructor
 */
const WriteListenerImpl = function(asyncContext) {
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
    const outStream = this.asyncContext.getResponse().getOutputStream();
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
        if (this.isFinished === true &&
                !this.asyncContext.getHttpChannelState().isResponseCompleted()) {
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
