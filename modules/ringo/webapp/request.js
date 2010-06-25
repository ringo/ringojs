/**
 * @fileOverview Adds convenience properties and methods to  a
 * [JSGI 0.3 request object](http://wiki.commonjs.org/wiki/JSGI/Level0/A/Draft2#Request).
 */

require('core/object');
require('core/string');
var {isUrlEncoded, parseParameters} = require('./parameters');
var {isFileUpload, parseFileUpload} = require('./fileupload');

var {Context, Scriptable} = org.mozilla.javascript;

export('Request', 'Session');

/**
 * Adds convenience properties and methods to  a
 * [JSGI 0.3 request object](http://wiki.commonjs.org/wiki/JSGI/Level0/A/Draft2#Request).
 *
 * @param request a JSGI 0.3 request object
 * @class Request
 */
function Request(request) {

    // check if request is already extended
    if (request.hasOwnProperty("path")) {
        return request;
    }

    var params, queryParams, postParams, cookies, session, headers;
    var servletRequest = request.env.servletRequest;

    /**
     * The name of the encoding used for this request
     * @name Request.instance.charset
     */
    request.charset = servletRequest.getCharacterEncoding();

    /**
     * The request's content type, or undefined if not available.
     * @name Request.instance.contentType
     */
    request.contentType = request.headers["content-type"];

    /**
     * The request's content length, or undefined if not available.
     * @name Request.instance.contentLength
     */
    request.contentLength = request.headers["content-length"];

    /**
     * The full URI path of the request.
     * @name Request.instance.path
     */
    request.path = request.scriptName + request.pathInfo;

    /**
     * The URL-decoded URI path.
     * @name Request.instance.pathDecoded
     */
    request.pathDecoded = decodeURI(request.path);

    /**
     * An object containing the parsed HTTP query string parameters sent with this request.
     * @name Request.instance.queryParams
     */
    Object.defineProperty(request, "queryParams", {
        get: function() {
            if (!queryParams) {
                queryParams = {};
                parseParameters(this.queryString, queryParams, this.charset);
            }
            return queryParams;
        }
    });

    /**
     * An object containing the parsed HTTP POST parameters sent with this request.
     * @name Request.instance.postParams
     */
    Object.defineProperty(request, "postParams", {
        get: function() {
            if (!postParams) {
                postParams = {};
                if (this.isPost || this.isPut) {
                    if (isUrlEncoded(this.contentType)) {
                        parseParameters(this.input.read(), postParams, this.charset);
                    } else if (isFileUpload(this.contentType)) {
                        parseFileUpload(this, postParams, this.charset);
                    }
                }
            }
            return postParams;
        }
    });

    /**
     * An object containing the parsed HTTP parameters sent with this request.
     * @name Request.instance.params
     */
    Object.defineProperty(request, "params", {
        get: function() {
            if (!params) {
                params = Object.merge(this.postParams, this.queryParams);
            }
            return params;
        }
    });

    /**
     * An object containing the HTTP cookie values sent with this request
     * @name Request.instance.cookies
     */
    Object.defineProperty(request, "cookies", {
        get: function() {
            if (!cookies) {
                cookies = new ScriptableMap();
                var servletCookies = servletRequest.getCookies();
                if (servletCookies) {
                    servletCookies.forEach(function(cookie) {
                        cookies[cookie.getName()] = cookie.getValue();
                    });
                }
            }
            return cookies;
        }
    });

    /**
     * A session object for the current request. If no session exists
     * a new one will be created.
     * @see Session
     * @name Request.instance.session
     */
    Object.defineProperty(request, "session", {
        get: function() {
            if (!session)
                session = new Session(this);
            return session;
        }
    });

    /**
     * Get a single request header value. If multiple headers exist for
     * the given name, only the first one is returned.
     * @name Request.instance.getHeader
     * @function
     */
    request.getHeader = function getHeader(name) {
        return request.headers[name.toLowerCase()];
    };

    /**
     * Get all header values for the given header name as an array.
     * @name Request.instance.getHeaders
     * @function
     */
    request.getHeaders = function getHeaders(name) {
        var headers = [];
        var servletHeaders = servletRequest.getHeaders(name);
        while (servletHeaders.hasMoreElements())
            headers.push(servletHeaders.nextElement());
        return headers;
    };

    /**
     * Reset the scriptName and pathInfo properties to their original values.
     * @name Request.instance.reset
     * @function
     */
    request.reset = function() {
        request.scriptName = servletRequest.getContextPath()
                           + servletRequest.getServletPath();
        request.pathInfo = servletRequest.getPathInfo();
    };

    /**
     * True if this is a HTTP GET request.
     * @name Request.instance.isGet
     */
    Object.defineProperty(request, "isGet", {
        get: function() {
            return this.method == "GET";
        }
    });

    /**
     * True if this is a HTTP POST request.
     * @name Request.instance.isPost
     */
    Object.defineProperty(request, "isPost", {
        get: function() {
            return this.method == "POST";
        }
    });

    /**
     * True if this is a HTTP PUT request.
     * @name Request.instance.isPut
     */
    Object.defineProperty(request, "isPut", {
        get: function() {
            return this.method == "PUT";
        }
    });

    /**
     * True if this is a HTTP DELETE request.
     * @name Request.instance.isDelete
     */
    Object.defineProperty(request, "isDelete", {
        get: function() {
            return this.method == "DELETE";
        }
    });

    /**
     * True if this is a HTTP HEAD request.
     * @name Request.instance.isHead
     */
    Object.defineProperty(request, "isHead", {
        get: function() {
            return this.method == "HEAD";
        }
    });

    /**
     * True if this is a XMLHttpRequest.
     * @name Request.instance.isXhr
     */
    Object.defineProperty(request, "isXhr", {
        get: function() {
            return this.headers["x-requested-with"] == "XMLHttpRequest";
        }
    });

    return request;
}

/**
 * An HTTP session object. Properties of the session's data
 * object are persisted between requests of the same client.
 * @param request a JSGI or servlet request object
 */
function Session(request) {

    var data;
    var servletRequest = request instanceof javax.servlet.ServletRequest ? 
            request : request.env.servletRequest;

    function getSession() {
        return servletRequest.getSession();
    }

    /**
     * A container for things to store in this session between requests.
     */
    Object.defineProperty(this, "data", {
        get: function() {
            if (!data) {
                // session.data is a JavaAdapter that directly proxies property access
                // to the attributes in the servlet session object.
                data = new JavaAdapter(Scriptable, {
                    put: function(name, start, value) {
                        getSession().setAttribute(name, Context.jsToJava(value, java.lang.Object));
                    },
                    get: function(name, start) {
                        return Context.javaToJS(getSession().getAttribute(name), global);
                    }
                });
            }
            return data;
        }
    });

    /**
     * True if this session was created in the current request.
     * This can be useful to find out if the client has cookies disabled
     * for cookie-based sessions.
     */
    Object.defineProperty(this, "isNew", {
        get: function() {
            getSession().isNew();
        }
    })

}

