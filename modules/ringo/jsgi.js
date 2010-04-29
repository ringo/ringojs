
include('ringo/webapp/util');
include('io');
include("binary");

export('handleRequest');
var log = require('ringo/logging').getLogger(module.id);
module.shared = true;

/**
 * Handle a JSGI request.
 * @param moduleId the module id. Ignored if functionObj is already a function.
 * @param functionObj the function, either as function object or function name to be
 *             imported from the module moduleId.
 * @param env the JSGI env object
 * @returns the JSGI response object
 */
function handleRequest(moduleId, functionObj, env) {
    initRequest(env);
    var app;
    if (typeof(functionObj) == 'function') {
        app = functionObj;
    } else {
        var module = require(moduleId);
        app = module[functionObj];
        var middleware = module.middleware || [];
        env["ringo.config"] = moduleId;
        app = middleware.reduceRight(middlewareWrapper, resolve(app));
    }
    if (!(typeof(app) == 'function')) {
        throw new Error('No valid JSGI app: ' + app);
    }
    var result = app(env);
    if (!result) {
        throw new Error('No valid JSGI response: ' + result);
    }
    commitResponse(env, result);
}

/**
 * Set up the I/O related properties of a jsgi environment object.
 * @param env a jsgi request object
 */
function initRequest(env) {
    var input, errors;
    if (env.hasOwnProperty('jsgi.input')) {
        // already set up, probably because the original request threw a retry
        return;
    }
    Object.defineProperty(env, "jsgi.input", {
        get: function() {
            if (!input)
                input = new Stream(env['jsgi.servlet_request'].getInputStream());
            return input;
        }
    });
    Object.defineProperty(env, "jsgi.errors", {
        value: system.stderr
    });
}

/**
 * Apply the return value of a JSGI application to a servlet response.
 * This is used internally by the org.ringojs.jsgi.JsgiServlet class, so
 * you won't need this unless you're implementing your own servlet
 * based JSGI connector.
 *
 * @param env the JSGI env argument
 * @param result the object returned by a JSGI application
 */
function commitResponse(env, result) {
    if (typeof result.then === "function") {
        handleAsyncResponse(env, result);
        return;
    }
    var request = env['jsgi.servlet_request'];    
    var response = env['jsgi.servlet_response'];
    var charset;
    if (!result.status || !result.headers || !result.body) {
        throw new Error('No valid JSGI response: ' + result);
    }
    var {status, headers, body} = result;
    response.status = status;
    for (var key in headers) {
        headers[key].split("\n").forEach(function(value) {
            response.addHeader(key, value);
        });
    }
    var charset = getMimeParameter(Headers(headers).get("Content-Type"), "charset");
    writeBody(response, body, charset);
}

function writeBody(response, body, charset) {
    if (body && typeof body.forEach == "function") {
        var output = response.getOutputStream();
        var writer = function(part) {
            if (!(part instanceof Binary)) {
                part = part.toByteString(charset);
            }
            output.write(part);
            output.flush();
        };
        body.forEach(writer);
        if (typeof body.close == "function") {
            body.close(writer);
        }
    } else {
        throw new Error("Response body doesn't implement forEach: " + body);
    }
}

function writeAsync(servletResponse, jsgiResponse) {
    if (!jsgiResponse.status || !jsgiResponse.headers || !jsgiResponse.body) {
        throw new Error('No valid JSGI response: ' + jsgiResponse);
    }
    var {status, headers} = jsgiResponse;
    servletResponse.status = status;
    for (var name in headers) {
        servletResponse.setHeader(name, headers[name]);
    }
    var charset = getMimeParameter(Headers(headers).get("Content-Type"), "charset");
    writeBody(servletResponse, jsgiResponse.body, charset);
}

function handleAsyncResponse(env, result) {
    // experimental support for asynchronous JSGI based on Jetty continuations
    var ContinuationSupport = org.eclipse.jetty.continuation.ContinuationSupport;
    var request = env['jsgi.servlet_request'];
    var continuation = ContinuationSupport.getContinuation(request);
    var handled = false;
    
    var onFinish = sync(function(value) {
        if (handled) return;
        log.debug("JSGI async response finished", value);
        handled = true;
        writeAsync(continuation.getServletResponse(), value);
        continuation.complete();
    }, request);

    var onError = sync(function(error) {
        if (handled) return;
        log.error("JSGI async error", error);
        var jsgiResponse = {
            status: 500,
            headers: {"Content-Type": "text/html"},
            body: ["<!DOCTYPE html><html><body><h1>Error</h1><p>", String(error), "</p></body></html>"]
        };
        handled = true;
        writeAsync(continuation.getServletResponse(), jsgiResponse);
        continuation.complete();
    }, request);

    continuation.addContinuationListener(new org.eclipse.jetty.continuation.ContinuationListener({
        onTimeout: sync(function() {
            if (handled) return;
            log.error("JSGI async timeout");
            var jsgiResponse = {
                status: 500,
                headers: {"Content-Type": "text/html"},
                body: ["<!DOCTYPE html><html><body><h1>Error</h1><p>Request timed out</p></body></html>"]
            };
            handled = true;
            writeAsync(continuation.getServletResponse(), jsgiResponse);
            continuation.complete();
        }, request)
    }));

    log.debug('handling JSGI async response, calling then');
    sync(function() {
        result.then(onFinish, onError);
        // default async request timeout is 30 seconds
        continuation.setTimeout(30000);
        continuation.suspend();
    }, request)();
}

/**
 * Convenience function that resolves a module id or object to a
 * JSGI middleware or application function. This assumes the function is
 * exported as "middleware" or "handleRequest".
 * @param module a function, module object, or moudule id
 */
function resolve(module) {
    if (typeof module == 'string') {
        module = require(module);
        return module.middleware || module.handleRequest;
    }
    return module;
}

/**
 * Helper function for wrapping middleware stacks
 * @param inner an app or middleware module or function wrapped by outer
 * @param outer a middleware module or function wrapping inner
 */
function middlewareWrapper(inner, outer) {
    return resolve(outer)(inner);
}
