/**
 * Continuation support for Helma NG
 */

export('ContinuationSession', 'handleRequest');

var system = require('helma/system');
var log = require('helma/logging').getLogger(__name__);

var __shared__ = true;

function ContinuationSession() {
    var pages = [];
    var ids = [];
    var currentstep = 0;
    for (var i = 0; i < arguments.length; i++) {
        pages.push(arguments[i]);
    }
    var length = pages.length;

    this.start = function() {
        var req = require('helma/webapp/env').req;
        if (!req.params.helma_continuation) {
            // set query param so helma knows to switch rhino optimization level to -1
            throw { redirect: getContinuationUrl(0) };
        }
        if (system.getOptimizationLevel() > -1) {
            system.setOptimizationLevel(-1);
            throw { retry: true };
        }
        currentstep = 0;
        ids[0] = id = req.params.helma_continuation;
        var continuation = createContinuation();
        if (continuation instanceof Continuation) {
            log.debug("Recording continuation start: " + id);
            setCallback(req, id, continuation);
            return req;
        } else {
            return continuation;
        }
    };

    this.step = function(step) {
        currentstep = step - 1;
        return this;
    };

    this.render = function(res) {
        var req = require('helma/webapp/env').req;
        // capture continuation and store it in callback container
        var id = getContinuationId(currentstep + 1);
        var continuation = createContinuation();
        if (continuation instanceof Continuation) {
            if (!getCallback(req, id))
                setCallback(req, id, continuation);
            // Exit current js context by calling empty continuation with return value
            new org.mozilla.javascript.NativeContinuation()(res);
        } else {
            return continuation;
        }        
    };

    this.page = function() {
        return pages[currentstep];
    };

    this.back = function() {
        return currentstep > 0 ? getContinuationUrl(currentstep - 1) : null;
    };

    this.forward = function() {
        return currentstep < length ? getContinuationUrl(currentstep + 1) : null;
    };

    function getContinuationUrl(step) {
        var req = require('helma/webapp/env').req;
        return req.path + "?helma_continuation=" + getContinuationId(step);
    }

    function getContinuationId(step) {
        if (ids[step] == null) {
            ids[step] = generateId();
        }
        return ids[step];
    }

    function createContinuation() {
        return new Continuation();
    }

    function generateId() {
        return Math.ceil(Math.random() * Math.pow(2, 32)).toString(36);
    }
}

/**
 * Continuation middleware function
 * @param req the request
 * @return the continuation result
 */
function handleRequest(req) {
    var id = req.params.helma_continuation;
    var continuation = getCallback(req, id);
    if (continuation) {
        if (system.getOptimizationLevel() > -1) {
            system.setOptimizationLevel(-1);
            throw { retry: true };
        }        
        log.debug("resuming continuation " + id + " with req " + req);
        return continuation(req);
    }
    return req.process();
}

var setCallback = function(req, id, func) {
    if (!req.session.data.continuation) {
        req.session.data.continuation = {};
    }
    log.debug("Registered continuation: " + id);
    req.session.data.continuation[id] = func;
    // fauxsessions[id] = func;
};

var getCallback = function(req, id) {
    if (!req.session.data.continuation || !req.session.data.continuation[id]) {
        return null;
    }
    return req.session.data.continuation[id];
    // return fauxsessions[id];
};

// awful hack to make this work on google app engine
// var fauxsessions = {}
