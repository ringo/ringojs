require('core.string');
var log = require('helma.logging').getLogger(__name__);
var system = require('helma.system');
system.addHostObject(org.helma.web.Request);
system.addHostObject(org.helma.web.Session);

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

// experimental parameter grouping

Request.prototype.__defineGetter__("grouped",
        function() {
            return new ParameterGroup("", this.data);
        });

function ParameterGroup(path, collection) {

    for (var i in collection) {
        if (i.startsWith(path)) {
            var dot = i.indexOf('.', path.length);
            var key, value;
            if (dot > -1) {
                key = i.slice(path.length, dot);
                value = new ParameterGroup(i.slice(0, dot + 1), collection);
            } else  {
                key = i.slice(path.length);
                value = collection[i];
            }
            if (!this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
    }

    return this;
}