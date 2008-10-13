/**
 * Continuation support for Helma. You need to run Rhino in interpreter mode
 * (rhino.optlevel = -1) for Continuations to work.
 *
 * This framework adds three static methods to the Continuation constructor:
 *
 * <ul>
 *   <li>Continuation.nextUrl()</li>
 *   <li>Continuation.nextPage()</li>
 * </ul>
 *
 * Example usage:
 *
 * <pre><code>
 *    function continuation_action() {
 *        res.write('<form method="post" action="' + Continuation.nextUrl() + '">\
 *                    <input name="foo"/>\
 *                    <input type="submit"/>\
 *                   </form>');
 *        Continuation.nextPage();
 *        var foo = req.data.foo;
 *        res.write('<a href="' + Continuation.nextUrl() + '">click here</a>');
 *        Continuation.nextPage();
 *        res.write("you said: " + foo);
 *    }
 * </code></pre>
 *
 */

var log = require('helma.logging').getLogger(__name__);
var system = require('helma.system');
system.addCallback('onInvoke', 'continuation-support', function(req) {
    if (req && req.params.helma_continuation != null) {
        system.setRhinoOptimizationLevel(-1);
    }
});

var continuation_id = null;


/**
 * Get the id for the next continuation, suitable for GET forms where
 * the id has to be set via hidden input field.
 * @param id the continuation id. If not given a new id is generated.
 * @return the continuation url
 */
Continuation.nextId = function(req, id) {
    id = getId(req, id);
    continuation_id = id;
    return continuation_id;
};

/**
 * Convenience method that returns the URL for the next continuation,
 * built from the current URL with an added continuation_id parameter.
 * Suitable for POST forms and links.
 * @param id the continuation id. If not given a new id is generated.
 * @return the continuation url
 */
Continuation.nextUrl = function(req, id) {
    id = getId(req, id);
    continuation_id = id;
    return Continuation.getUrl(req, id);
};

/**
 * Get the url for a continuation with the given id.
 * @param id the continuation id. If not given a new id is generated.
 * @return the continuation url
 */
Continuation.getUrl = function(req, id) {
   return req.path + "?helma_continuation=" + getId(req, id);
}

/**
 * Stop current execution and register continuation for later resumption.
 * @param id the continuation id. If not given a new id is generated.
 */
Continuation.nextPage = function(req, id) {
    // capture continuation and store it in callback container
    id = getId(req, id);
    setCallback(req, id, new Continuation());
    // trick to exit current context: call empty continuation
    new org.mozilla.javascript.NativeContinuation()();
};

Continuation.startId = function(req, id) {
    id = req.data.helma_continuation || id;
    return id;    
}

/**
 * This is a utility method used at the start of a continuation action.
 * If the current request does not have a continuation id, it is redirected
 * to a request containing one. If the request does have a continuation id,
 * the current state is registered as continuation start marker. This can be
 * used to avoid re-executing earlier code containing definition of local
 * variables.
 * @param id the continuation id. If not given a new id is generated.
 * @return the continuation result
 */
Continuation.markStart = function(req, res, id) {
    if (!req.data.helma_continuation) {
        // set query param so helma knows to switch rhino optimization level to -1
        res.redirect(Continuation.nextUrl(req, id));
    } else {
        id = req.data.helma_continuation;
        var cont = new Continuation();
        log.info("Recording continuation start: " + id);
        setCallback(req, id, cont);
        continuation_id = null;
        cont([req, res]);
    }
}

/**
 * Register current state with the given id but don't exit execution context
 * @param id the continuation id. If not given a new id is generated.
 * @return the continuation id
 */
Continuation.registerPage = function(req, id) {
    id = getId(req, id);
    setCallback(req, id, new Continuation());
    return Continuation.getUrl(req, id); 
}

// Private helper functions

var getId = function(req, id) {
   if (id == null) {
      return continuation_id || generateId(req);
   }
   return (String(id));
}

var generateId = function(req) {
    var id;
    do {
        id = Math.ceil(Math.random() * Math.pow(2, 64)).toString(36);
    } while (getCallback(req, id));
    log.debug("Generated continuation id: " + id);
    return id;
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

/**
 * Check if there is a helma_continuation http parameter, and if so,
 * check if there is a matching continuation, and if so, invoke the continuation
 * and return null.
 */
var resume = function(req, res) {
    var continuationId = req.params.helma_continuation;
    if (continuationId && req.session.data.continuation) {
        var continuation = req.session.data.continuation[continuationId];
        if (continuation) {
            log.debug("Resuming continuation " + continuationId);
            try {
                continuation([req, res]);
                return true;
            } catch (e) {
                error(e);
                return true;
            }
        }
    }
    return false;
}
