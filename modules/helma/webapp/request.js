loadModule('core.string');
var log = loadModule('helma.logging').getLogger(__name__);
var system = loadModule('helma.system');
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

    var props;

    function initProps() {
        props = {};
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
                if (!(key in props)) {
                    props[key] = value;
                }
            }
        }
    }

    this.__get__ = function(name) {
        if (!props) {
            initProps();
        }
        return props[name];
    };

    this.__has__ = function(name) {
        if (!props) {
            initProps();
        }
        return name in props || name in this;
    };

    this.__getIds__ = function() {
        var ids = [];
        if (!props) {
            initProps();
        }
        for (var key in props) {
            ids.push(key);
        }
        return ids;
    }

    return this;
}