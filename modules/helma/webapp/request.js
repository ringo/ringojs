require('core/string');
include('helma/functional');
include('helma/util');

export('Request');

// var log = require('helma/logging').getLogger(__name__);

function Request(servletRequest) {

    var params, cookies, session, headers;
    var define = bindArguments(Object.defineProperty, this);

    define("charset", readWritePropertyDesc(servletRequest, "characterEncoding"));
    define("port", readOnlyPropertyDesc(servletRequest, "port"));
    define("path", readOnlyPropertyDesc(servletRequest, "requestURI"));
    define("method", readOnlyPropertyDesc(servletRequest, "method"));

    define("params", {
        get: function() {
            if (!params)
                params = new ScriptableMap(
                        new org.helma.util.ParameterMap(
                                servletRequest.getParameterMap()));
            return params;
        }
    });

    define("cookies", {
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

    define("session", {
        get: function() {
            if (!session)
                session = new Session(servletRequest);
            return session;
        }
    });

    define("headers", {
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

    define("getHeader", {
        value: function getHeader(name) {
            return servletRequest.getHeader(name);
        }
    });

    define("getHeaders", {
        value: function getHeaders(name) {
            var headers = [];
            var servletHeaders = servletRequest.getHeaders(name);
            while (servletHeaders.hasMoreElements())
                headers.push(servletHeaders.nextElement());
            return headers;
        }
    });
}

function Session(servletRequest) {

    var data;
    var define = bindArguments(Object.defineProperty, this);

    function getSession() {
        return servletRequest.getSession();
    }

    define("data", {
        get: function() {
            if (!data) {
                var session = getSession();
                data = session.getAttribute("helma");
                if (!data) {
                    data = new ScriptableMap();
                    session.setAttribute("helma", data);
                } else {
                    data = new ScriptableMap(data);
                }
            }
            return data;
        }
    });

    define("isNew", {
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

    define("name", {
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

    define("value", {
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

    define("domain", {
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

    define("path", {
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

    define("maxAge", {
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

    define("comment", {
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

    define("isSecure", {
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

    define("version", {
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

var defineRequestProperty = bindArguments(Object.defineProperty, Request.prototype);

defineRequestProperty("isGet", {
    get: function() { return this.method == "GET"; }
})

defineRequestProperty("isPost", {
    get: function() { return this.method == "POST"; }
})

defineRequestProperty("isPut", {
    get: function() { return this.method == "PUT"; }
})

defineRequestProperty("isDelete", {
    get: function() { return this.method == "DELETE"; }
})

defineRequestProperty("isHead", {
    get: function() { return this.method == "HEAD"; }
})
