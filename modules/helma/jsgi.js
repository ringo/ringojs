
include('helma/webapp/util');
include('io');
include("binary");

export('handleRequest');

module.shared = true;

/**
 * Handle a JSGI request.
 * @param module the module. Ignored if func is already a function.
 * @param func the function, either as function object or function name to be
 *             imported from module.
 * @param env the JSGI env object
 */
function handleRequest(module, func, env) {
    initRequest(env);
    var app;
    if (typeof(func) == 'function') {
        app = func;
    } else {
        module = require(module);
        app = module[func];
        var middleware = module.middleware || [];
        app = middleware.reduceRight(middlewareWrapper, resolve(app));
    }
    if (!(typeof(app) == 'function')) {
        throw new Error('No valid JSGI app: ' + app);
    }
    var result = app(env);
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
        get: function() {
            if (!errors)
                errors = new Stream(java.lang.System.err);
            return errors;
        }
    });
}

/**
 * Apply the return value of a JSGI application to a servlet response.
 * This is used internally by the org.helma.jsgi.JsgiServlet class, so
 * you won't need this unless you're implementing your own servlet
 * based JSGI connector.
 *
 * @param env the JSGI env argument
 * @param result the object returned by a JSGI application
 */
function commitResponse(env, result) {
    if (!result || !result.status || !result.headers || !result.body) {
        throw new Error('No valid JSGI response: ' + result);
    }
    var response = env['jsgi.servlet_response'];
    if (response.isCommitted()) {
        return;
    }
    if (!result) {
        throw new Error("JSGI app did not return a response object");
    }
    if (typeof result.close == "function") {
        result = result.close();
    }
    var {status, headers, body} = result;
    response.status = status;
    for (var name in headers) {
        response.setHeader(name, headers[name]);
    }
    var charset = getMimeParameter(Headers(headers).get("Content-Type"), "charset") || "UTF-8";
    var output = response.getOutputStream();
    if (body && typeof body.forEach == "function") {
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
    output.close();
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
