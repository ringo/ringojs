require('core/string');
include('ringo/functional');
include('ringo/utils');
include('./parameters');
include('./fileupload');
importClass(org.mozilla.javascript.Context);
importClass(org.mozilla.javascript.Scriptable);

export('Request', 'Session');

// var log = require('ringo/logging').getLogger(module.id);
module.shared = true;

function Request(env) {

    var params, cookies, session, headers;
    var servletRequest = env["jsgi.servlet_request"];

    this.charset = servletRequest.getCharacterEncoding();
    this.pathInfo = env.PATH_INFO;
    this.scriptName = env.SCRIPT_NAME;
    Object.defineProperty(this, "env", {value: env});
    Object.defineProperty(this, "contentType", {value: env.CONTENT_TYPE});
    Object.defineProperty(this, "contentLength", {value: env.CONTENT_LENGTH});
    // Object.defineProperty(this, "servletRequest", {get: function() servletRequest});
    Object.defineProperty(this, "port", {value: env.SERVER_PORT});
    Object.defineProperty(this, "path", {value: env.SCRIPT_NAME + env.PATH_INFO});
    Object.defineProperty(this, "queryString", {value: env.QUERY_STRING});
    Object.defineProperty(this, "method", {value: env.REQUEST_METHOD});

    Object.defineProperty(this, "pathDecoded", {
        get: function() { return decodeURI(this.path) }
    });

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

    Object.defineProperty(this, "cookies", {
        get: function() {
            if (!cookies) {
                cookies = new ScriptableMap();
                (servletRequest.getCookies() || []).map(function mapCookie(servletCookie) {
                    return new Cookie(servletCookie);
                }).forEach(function addCookie(cookie) {
                    cookies[cookie.name] = cookie;
                });
            }
            return cookies;
        }
    });

    Object.defineProperty(this, "session", {
        get: function() {
            if (!session)
                session = new Session(servletRequest);
            return session;
        }
    });

    Object.defineProperty(this, "headers", {
        get: function() {
            if (!headers) {
                headers = new ScriptableMap();
                var names = servletRequest.getHeaderNames();
                while (names.hasMoreElements()) {
                    let name = names.nextElement()
                    headers[name] = servletRequest.getHeader(name);
                }
            }
            return headers;
        }
    });

    Object.defineProperty(this, "getHeader", {
        value: function getHeader(name) {
            return servletRequest.getHeader(name);
        }
    });

    Object.defineProperty(this, "getHeaders", {
        value: function getHeaders(name) {
            var headers = [];
            var servletHeaders = servletRequest.getHeaders(name);
            while (servletHeaders.hasMoreElements())
                headers.push(servletHeaders.nextElement());
            return headers;
        }
    });

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

function Session(servletRequest) {

    var data;
    var define = bindArguments(Object.defineProperty, this);

    function getSession() {
        return servletRequest.getSession();
    }

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

    Object.defineProperty(this, "isNew", {
        get: function() {
            getSession().isNew();
        }
    })

}

function Cookie(servletCookie) {

    var name, path, maxAge, domain, comment, isSecure, value, version;
    var define = bindArguments(Object.defineProperty, this);

    function getCookie() {
        return servletCookie;
    }

    Object.defineProperty(this, "name", {
        get: function() {
            if (!name)
                name = getCookie().getName();
            return name;
        },

        set: function(value) {
            if (value) {
                name = value;
                getCookie().setName(name);
            }
            return name;
        }
    });

    Object.defineProperty(this, "value", {
        get: function() {
            if (!value)
                value = getCookie().getValue();
            return value;
        },

        set: function(val) {
            if (val) {
                value = val;
                getCookie().setValue(value);
            }
            return value;
        }
    });

    Object.defineProperty(this, "domain", {
        get: function() {
            if (!domain)
                domain = getCookie().getDomain();
            return domain;
        },

        set: function(value) {
            if (value) {
                domain = value;
                getCookie().setDomain(domain);
            }
            return domain;
        }
    });

    Object.defineProperty(this, "path", {
        get: function() {
            if (!path)
                path = getCookie().getPath();
            return path;
        },

        set: function(value) {
            if (value) {
                path = value;
                getCookie().setPath(path);
            }
            return path;
        }
    });

    Object.defineProperty(this, "maxAge", {
        get: function() {
            if (!maxAge)
                maxAge = getCookie().getMaxAge();
            return maxAge;
        },

        set: function(value) {
            if (value) {
                maxAge = value;
                getCookie().setMaxAge(maxAge);
            }
            return maxAge;
        }
    });

    Object.defineProperty(this, "comment", {
        get: function() {
            if (!comment)
                comment = getCookie().getComment();
            return comment;
        },

        set: function(value) {
            if (value) {
                comment = value;
                getCookie().setComment(comment);
            }
            return comment;
        }
    });

    Object.defineProperty(this, "isSecure", {
        get: function() {
            if (!isSecure)
                isSecure = getCookie().getSecure();
            return isSecure;
        },

        set: function(value) {
            if (value) {
                isSecure = value;
                getCookie().setSecure(isSecure);
            }
            return isSecure;
        }
    });

    Object.defineProperty(this, "version", {
        get: function() {
            if (!version)
                version = getCookie().getVersion();
            return version;
        },

        set: function(value) {
            if (value) {
                version = value;
                getCookie().setVersion(version);
            }
            return version;
        }
    });
}

Object.defineProperty(Request.prototype, "isGet", {
    get: function() { return this.method == "GET"; }
})

Object.defineProperty(Request.prototype, "isPost", {
    get: function() { return this.method == "POST"; }
})

Object.defineProperty(Request.prototype, "isPut", {
    get: function() { return this.method == "PUT"; }
})

Object.defineProperty(Request.prototype, "isDelete", {
    get: function() { return this.method == "DELETE"; }
})

Object.defineProperty(Request.prototype, "isHead", {
    get: function() { return this.method == "HEAD"; }
})
