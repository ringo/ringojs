require('core.string');
import('helma.system', 'system');

system.addHostObject(org.helma.web.Request);
system.addHostObject(org.helma.web.Session);

var log = require('helma.logging').getLogger(__name__);

(function() {

    function cachedGetter(name, fn) {
        return function() {
            // make sure to never set anything on request prototype
            if (this != Request.prototype) {
                var cache = this.__property_cache__;
                if (!cache) {
                    cache = this.__property_cache__ = {};
                }
                if (!cache[name]) {
                    cache[name] = fn.apply(this);
                }
                return cache[name];
            }
        };
    }

    function ParameterGroup(path, map) {

        for (var i in map) {
            if (i.startsWith(path)) {
                var dot = i.indexOf('.', path.length);
                var key, value;
                if (dot > -1) {
                    key = i.slice(path.length, dot);
                    value = new ParameterGroup(i.slice(0, dot + 1), map);
                } else {
                    key = i.slice(path.length);
                    value = map[i];
                }
                if (!this.hasOwnProperty(key)) {
                    this[key] = value[0];
                }
            }
        }

        return this;
    }

    /**
     * Return true if this is a HTTP POST request.
     */
    this.isPost = function() {
        return this.method == "POST";
    }

    /**
     * Return true if this is a HTTP GET request.
     */
    this.isGet = function() {
        return this.method == "GET";
    }

    /* this.__defineGetter__("cookies", cachedGetter('cookies',
        function() {
            var cookies = {};
            for each (var cookie in this.getCookies()) {
                cookies[cookie.name] = cookie.value;
            }
            return cookies;
        })
    ); */

    /* this.__defineGetter__("params", cachedGetter('params', function() {
            return new ParameterGroup("", this.getParameterMap());
        })
    ); */

    this.__defineGetter__("data", cachedGetter('data', function() {
            return new ParameterGroup("", this.getParameterMap());
        })
    );
 
}).apply(Request.prototype);
