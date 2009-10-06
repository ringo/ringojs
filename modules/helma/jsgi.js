
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
    var result = typeof(func) == 'function' ?
                 func(env) :
                 require(module)[func](env);
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
                input = new IOStream(env['jsgi.servlet_request'].getInputStream());
            return input;
        }
    });
    Object.defineProperty(env, "jsgi.errors", {
        get: function() {
            if (!errors)
                errors = new IOStream(java.lang.System.err);
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
    var charset = getMimeParameter(HeaderMap(headers).get("Content-Type"), "charset") || "UTF-8";
    var output = response.getOutputStream();
    if (body && typeof body.forEach == "function") {
        body.forEach(function(part) {
            output.write(part.toByteString(charset));
        });
    } else {
        throw new Error("Response body doesn't implement forEach: " + body);
    }
    output.close();
}
