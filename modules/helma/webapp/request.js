require('core.string');
import('helma.system', 'system');

system.addHostObject(org.helma.web.Request);
system.addHostObject(org.helma.web.Session);

var log = require('helma.logging').getLogger(__name__);

/**
 * Return true if this is a HTTP POST request.
 */
Request.prototype.isPost = function() {
    return this.method == "POST";
}

/**
 * Return true if this is a HTTP GET request.
 */
Request.prototype.isGet = function() {
    return this.method == "GET";
}

/* Object.defineProperty(Request.prototype, "cookies", {
    getter: function() {
        if (!this._cookies) {
            this._cookies = {};
            var cookies = this.getCookies();
            for each (var cookie in cookies) {

            }
        }
        return this._cookies;
    }
}); */

if (!Request.prototype.hasOwnProperty("params")) {
    Object.defineProperty(Request.prototype, "params", {
        getter: function() {
            return new ParameterGroup("", this.getParameterMap());
        }
    });
}

if (!Request.prototype.hasOwnProperty("data")) {
    Object.defineProperty(Request.prototype, "data", {
        getter: function() {
            return new ParameterGroup("", this.getParameterMap());
        }
    });
}

function ParameterGroup(path, map) {

    map = map || this.getParameterMap();

    for (var i in map) {
        if (i.startsWith(path)) {
            var dot = i.indexOf('.', path.length);
            var key, value;
            if (dot > -1) {
                key = i.slice(path.length, dot);
                value = new ParameterGroup(i.slice(0, dot + 1), map);
            } else  {
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