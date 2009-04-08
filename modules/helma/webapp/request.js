require('core/string');
include('helma/functional');
include('helma/util');

export('Request');

// var log = require('helma/logging').getLogger(__name__);

function Request(servletRequest) {

    var params, cookies, session, headers;
    var define = bindArguments(Object.defineProperty, this);

    define("charset", readOnlyPropertyDesc(servletRequest, "characterEncoding"));
    define("port", readOnlyPropertyDesc(servletRequest, "port"));
    define("path", readOnlyPropertyDesc(servletRequest, "requestURI"));
    define("method", readOnlyPropertyDesc(servletRequest, "method"));

    define("params", {
        getter: function() {
            if (!params)
                params = new ScriptableMap(
                        new org.helma.util.ParameterMap(
                                servletRequest.getParameterMap()));
            return params;
        }
    });

    define("cookies", {
        getter: function() {
            if (!cookies)
                cookies = new ScriptableMap();
            return cookies;
        }
    });

    define("session", {
        getter: function() {
            if (!session)
                session = new Session(servletRequest);
            return session;
        }
    });

    define("headers", {
        getter: function() {
            if (!headers)
                headers = new ScriptableMap();
            return params;
        }
    });

    define("getHeader", {
        value: function getHeader(name) {
            return servletRequest.getHeader(name);
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
        getter: function() {
            if (!data) {
                data = new ScriptableMap();
                getSession().setAttribute("helma", data);
            }
            return data;
        }
    });

    define("isNew", {
        getter: function() {
            getSession().isNew();
        }
    })

}

var defineRequestProperty = bindArguments(Object.defineProperty, Request.prototype);

defineRequestProperty("isGet", {
    getter: function() { return this.method == "GET"; }
})

defineRequestProperty("isPost", {
    getter: function() { return this.method == "POST"; }
})

defineRequestProperty("isPut", {
    getter: function() { return this.method == "PUT"; }
})

defineRequestProperty("isDelete", {
    getter: function() { return this.method == "DELETE"; }
})

defineRequestProperty("isHead", {
    getter: function() { return this.method == "HEAD"; }
})
