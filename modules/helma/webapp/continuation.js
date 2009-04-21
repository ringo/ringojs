/**
 * Continuation support for Helma NG
 */

include('helma/webapp/response');
var system = require('helma/system');

export('handleRequest', "ContinuationMark", "ContinuationRequest", "ContinuationUrl", "ContinuationId");

var log = require('helma/logging').getLogger(__name__);

var ids = {};

function ContinuationUrl(key) {
    return "?helma_continuation=" + ContinuationId(key);
}

function ContinuationId(key) {
    if (!key)
        return generateId();
    if (!(key in ids))
        ids[key] = generateId();
    return ids[key];
}

/**
 * Stop current execution and register continuation for later resumption.
 * @param id the continuation id. If not given a new id is generated.
 */
function ContinuationRequest(req, res, key) {
    // capture continuation and store it in callback container
    var id = ContinuationId(key);
    log.debug("registering callback for id " + id);
    setCallback(req, id, new Continuation());
    // trick to exit current context: call empty continuation
    new org.mozilla.javascript.NativeContinuation()(res);
};

function ContinuationMark(req, key) {
    if (system.getOptimizationLevel() > -1) {
        system.setOptimizationLevel(-1);
        throw { retry: true };
    }
    if (!req.params.helma_continuation) {
        // set query param so helma knows to switch rhino optimization level to -1
        throw { redirect: ContinuationUrl() };
    }
    var id = req.params.helma_continuation;
    ids[key] = id;
    var cont = new Continuation();
    log.debug("Recording continuation start: " + id);
    setCallback(req, id, cont);
    return req;
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
        log.debug("resuming continuation " + id + " with req " + req);
        return continuation(req);
    }
    return req.process();
}

function generateId() {
    return Math.ceil(Math.random() * Math.pow(2, 32)).toString(36);
}

var setCallback = function(req, id, func) {
    if (!req.session.data.continuation) {
        req.session.data.continuation = {};
    }
    log.debug("Registered continuation: " + id);
    req.session.data.continuation[id] = func;
};

var getCallback = function(req, id) {
    if (!req.session.data.continuation || !req.session.data.continuation[id]) {
        return null;
    }
    return req.session.data.continuation[id];
};
