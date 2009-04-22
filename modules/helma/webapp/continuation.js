/**
 * Continuation support for Helma NG
 */

include('helma/webapp/response');
var system = require('helma/system');

export('handleRequest', "ContinuationMark", "ContinuationRequest", "ContinuationUrl", "ContinuationId");

var log = require('helma/logging').getLogger(__name__);

var ids = {};

function ContinuationUrl(name) {
    return "?helma_continuation=" + ContinuationId(name);
}

function ContinuationId(name) {
    if (!name)
        return generateId();
    if (!(name in ids))
        ids[name] = generateId();
    return ids[name];
}

/**
 * Stop current execution and register continuation for later resumption.
 * @param id the continuation id. If not given a new id is generated.
 */
function ContinuationRequest(req, name, res) {
    // capture continuation and store it in callback container
    var id = ContinuationId(name);
    var continuation = createContinuation();
    if (continuation instanceof Continuation) {
        log.debug("Registering continuation for id: " + id);
        setCallback(req, id, continuation);
        // Exit current js context by calling empty continuation with return value
        new org.mozilla.javascript.NativeContinuation()(res);
    } else {
        return continuation;
    }
}

function ContinuationMark(req, name) {
    if (!req.params.helma_continuation) {
        // set query param so helma knows to switch rhino optimization level to -1
        throw { redirect: ContinuationUrl() };
    }
    if (system.getOptimizationLevel() > -1) {
        system.setOptimizationLevel(-1);
        throw { retry: true };
    }
    var id = req.params.helma_continuation;
    ids[name] = id;
    var continuation = createContinuation();
    if (continuation instanceof Continuation) {
        log.debug("Recording continuation start: " + id);
        setCallback(req, id, continuation);
        return req;
    } else {
        return continuation;
    }
}

function createContinuation() {
    return new Continuation();
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
