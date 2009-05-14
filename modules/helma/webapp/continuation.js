/**
 * Continuation support for Helma NG
 */

export('ContinuationSession');

var system = require('helma/system');
var log = require('helma/logging').getLogger(__name__);
importClass(java.util.HashMap);

function ContinuationSession(req) {

    var id = req.params._cid;

    if (!id) {
        throw {redirect: getContinuationUrl(0)};
    }

    var data = getData(req) || new HashMap();
    var pages = [];
    var callbacks = [];
    var length = 0;
    var step = parseInt(req.params._cstep) || 0;

    this.addPage = function(name, callback) {
        pages.push(name);
        callbacks.push(callback);
        length = pages.length;
    }

    this.run = function() {
        var callback = callbacks[step];
        if (!(typeof callback === "function")) {
            throw new Error("invalid continuation step: " + step);
        }
        var result = callback(req);
        setData(req, id, data);
        return result;
    };

    Object.defineProperty(this, "data", {
        value: new ScriptableMap(data)
    });

    Object.defineProperty(this, "page", {
        get: function() pages[step]
    });

    Object.defineProperty(this, "step", {
        get: function() step,
        set: function(s) { step = s; }
    })

    this.back = function() {
        return step > 0 ? getContinuationUrl(step - 1) : null;
    };

    this.forward = function() {
        return step < length ? getContinuationUrl(step + 1) : null;
    };

    function getContinuationUrl(step) {
        id = id || generateId();
        return req.path + "?_cid=" + id + "&_cstep=" + String(step);
    }

    function generateId() {
        return Math.ceil(Math.random() * Math.pow(2, 32)).toString(36);
    }
}

var setData = function(req, id, data) {
    log.debug("Setting continuation data: " + id);
    req.session.data[id] = data;
};

var getData = function(req, id) {
    id = id || req.params._cid;
    if (!id) {
        return null;
    }
    return req.session.data[id];
};

