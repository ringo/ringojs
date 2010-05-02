require('core/string');
var {isUrlEncoded, parseParameters} = require('./parameters');
var {isFileUpload, parseFileUpload} = require('./fileupload');

var {Context, Scriptable} = org.mozilla.javascript;

export('Request', 'Session');

module.shared = true;

/**
 * A convenience wrapper around a JSGI env object.
 * @param env the JSGI env object
 */
function Request(env) {

    var params, cookies, session, headers;
    var servletRequest = env["jsgi.servlet_request"];

    /**
     * The name of the encoding used for this request
     */
    this.charset = servletRequest.getCharacterEncoding();

    /**
     * The JSGI PATH_INFO property. This is adjusted by ringo/webapp
     * request dispatcher as the request is mapped to a module.
     */
    this.pathInfo = env.PATH_INFO;

    /**
     * The JSGI SCRIPT_NAME property. This is adjusted by ringo/webapp
     * request dispatcher as the request is mapped to a module.
     */
    this.scriptName = env.SCRIPT_NAME;

    /**
     * The wrapped JSGI env object.
     */
    Object.defineProperty(this, "env", {value: env});

    /**
     * The request's content type, or undefined if not available.
     */
    Object.defineProperty(this, "contentType", {value: env.CONTENT_TYPE});

    /**
     * The request's content length, or undefined if not available.
     */
    Object.defineProperty(this, "contentLength", {value: env.CONTENT_LENGTH});

    /**
     * The server port this request was made on
     */
    Object.defineProperty(this, "port", {value: env.SERVER_PORT});

    /**
     * The full URI path of the request.
     */
    Object.defineProperty(this, "path", {value: env.SCRIPT_NAME + env.PATH_INFO});

    /**
     * The query string of the request.
     */
    Object.defineProperty(this, "queryString", {value: env.QUERY_STRING});

    /**
     * The request's HTTP method.
     */
    Object.defineProperty(this, "method", {value: env.REQUEST_METHOD});

    /**
     * The URL-decoded URI path.
     */
    Object.defineProperty(this, "pathDecoded", {
        get: function() { return decodeURI(this.path) }
    });

    /**
     * An object containing the parsed HTTP parameters sent with this request.
     */
    Object.defineProperty(this, "params", {
        get: function() {
            if (!params) {
                params = {};
                if (this.isPost) {
                    if (isUrlEncoded(this.contentType)) {
                        var body = env["jsgi.input"].read();
                        parseParameters(body, params, this.charset);
                    } else if (isFileUpload(this.contentType)) {
                        parseFileUpload(env, params, this.charset);
                    }
                }
                parseParameters(this.queryString, params, this.charset);
            }
            return params;
        }
    });

    /**
     * An object containing the HTTP cookie values sent with this request
     */
    Object.defineProperty(this, "cookies", {
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
     */
    Object.defineProperty(this, "session", {
        get: function() {
            if (!session)
                session = new Session(env);
            return session;
        }
    });

    /**
     * A collection containing the request's headers.
     */
    Object.defineProperty(this, "headers", {
        get: function() {
            if (!headers) {
                headers = new ScriptableMap();
                var names = servletRequest.getHeaderNames();
                while (names.hasMoreElements()) {
                    let name = names.nextElement();
                    headers[name] = servletRequest.getHeader(name);
                }
            }
            return headers;
        }
    });

    /**
     * Get a single request header value. If multiple headers exist for
     * the given name, only the first one is returned.
     */
    Object.defineProperty(this, "getHeader", {
        value: function getHeader(name) {
            return servletRequest.getHeader(name);
        }
    });

    /**
     * Get all header values for the given header name as an array.
     */
    Object.defineProperty(this, "getHeaders", {
        value: function getHeaders(name) {
            var headers = [];
            var servletHeaders = servletRequest.getHeaders(name);
            while (servletHeaders.hasMoreElements())
                headers.push(servletHeaders.nextElement());
            return headers;
        }
    });

   /**
    * @ignore used internally by ringo/webapp
    */
    Object.defineProperty(this, "appendToScriptName", {
        value: function appendToScriptName(fragment) {
            var path = this.pathInfo;
            var pos = path.indexOf(fragment);
            if (pos > -1) {
                pos +=  fragment.length;
                // add matching pattern to script-name
                this.scriptName += path.substring(0, pos);
                // ... and remove it from path-info
                this.pathInfo = path.substring(pos);
            }
        }
    });

    /**
     * @ignore used internally by ringo/webapp
     */
    Object.defineProperty(this, "checkTrailingSlash", {
        value: function checkTrailingSlash() {
            // only redirect for GET requests
            if (!this.path.endsWith("/") && this.isGet) {
                var path = this.queryString ?
                           this.path + "/?" + this.queryString : this.path + "/";
                throw {redirect: path};
            }
        }
    });
}

/**
 * True if this is a HTTP GET request.
 */
Object.defineProperty(Request.prototype, "isGet", {
    get: function() { return this.method == "GET"; }
});

/**
 * True if this is a HTTP POST request.
 */
Object.defineProperty(Request.prototype, "isPost", {
    get: function() { return this.method == "POST"; }
});

/**
 * True if this is a HTTP PUT request.
 */
Object.defineProperty(Request.prototype, "isPut", {
    get: function() { return this.method == "PUT"; }
});

/**
 * True if this is a HTTP DELETE request.
 */
Object.defineProperty(Request.prototype, "isDelete", {
    get: function() { return this.method == "DELETE"; }
});

/**
 * True if this is a HTTP HEAD request.
 */
Object.defineProperty(Request.prototype, "isHead", {
    get: function() { return this.method == "HEAD"; }
});

/**
 * True if this is a XMLHttpRequest.
 */
Object.defineProperty(Request.prototype, "isXhr", {
    get: function() this.getHeader("X-Requested-With") == "XMLHttpRequest"
});

/**
 * An HTTP session object. Properties of the session's data
 * object are persisted between requests of the same client.
 * @param env the JSGI env object
 */
function Session(env) {

    var data;

    function getSession() {
        return env["jsgi.servlet_request"].getSession();
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

