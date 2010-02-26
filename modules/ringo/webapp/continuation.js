/**
 * Continuation support for RingoJS
 */

require('core/string');
var log = require('ringo/logging').getLogger(module.id);
importClass(java.util.HashMap);

export('ContinuationSession');

function ContinuationSession(req, id, step) {

    step = parseInt(step) || 0;
    var data = getData(req, id);
    var pages = [];
    var callbacks = [];
    var length = 0;

    this.addPage = function(name, callback) {
        pages.push(name);
        callbacks.push(callback);
        length = pages.length;
    }

    this.run = function() {
        if (!this.isActive()) {
            throw {redirect: this.first()};
        }
        var callback = callbacks[step];
        if (!(typeof callback === "function")) {
            throw new Error("invalid continuation step: " + step);
        }
        var result = callback(req);
        setData(req, id, data);
        return result;
    };

    this.isActive = function() {
        return id != null;
    }

    Object.defineProperty(this, "data", {
        get: function() {
            data = data || new HashMap();
            return new ScriptableMap(data)
        }
    });

    Object.defineProperty(this, "page", {
        get: function() pages[step]
    });

    Object.defineProperty(this, "step", {
        get: function() step,
        set: function(s) { step = s; }
    })

    this.first = function() {
        return getContinuationUrl(0);
    }

    this.last = function() {
        return getContinuationUrl(length - 1);
    }

    this.current = function() {
        return getContinuationUrl(step);
    }

    this.previous = function() {
        return step > 0 ? getContinuationUrl(step - 1) : null;
    };

    this.next = function() {
        return step < length ? getContinuationUrl(step + 1) : null;
    };

    function getContinuationUrl(step) {
        id = id || generateId();
        return [req.scriptName, id, String(step)].join("/");
    }

    function generateId() {
        var id;
        do {
            id = String.random(5);
        } while (getData(req, id))
        return id;
    }
}

var setData = function(req, id, data) {
    log.debug("Setting continuation data: " + id);
    req.session.data[id] = data;
};

var getData = function(req, id) {
    if (!id) {
        return null;
    }
    return req.session.data[id];
};

