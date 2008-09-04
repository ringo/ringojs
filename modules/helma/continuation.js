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

importModule('helma.logging', 'logging');
var log = logging.getLogger(__name__);

var continuation_id = null;

/**
 * Get the id for the next continuation, suitable for GET forms where
 * the id has to be set via hidden input field.
 */
Continuation.nextId = function() {
    if (!continuation_id) {
        continuation_id = generateId();
    }
    return continuation_id;
};

/**
 * Convenience method that returns the URL for the next continuation,
 * built from the current URL with an added continuation_id parameter.
 * Suitable for POST forms and links.
 */
Continuation.nextUrl = function(id) {
    id = id || Continuation.nextId();
    return req.path + "?helma_continuation=" + id;
};

/**
 * Stop current execution and register continuation for later resumption.
 */
Continuation.nextPage = function(id) {
    // capture continuation and store it in callback container
    id = id || Continuation.nextId();
    setCallback(id, new Continuation());
    // trick to exit current context: call empty continuation
    new org.mozilla.javascript.NativeContinuation()();
};

// Private helper functions

var generateId = function() {
    var id;
    do {
        id = Math.ceil(Math.random() * Math.pow(2, 64)).toString(36);
    } while (getCallback(id));
    log.debug("Generated continuation id: " + id);
    return id;
}

var setCallback = function(id, func) {
    if (!session.data.continuation) {
        session.data.continuation = {};
    }
    log.debug("Registered continuation: " + id);
    session.data.continuation[id] = func;
};

var getCallback = function(id) {
    if (!session.data.continuation || !session.data.continuation[id]) {
        return null;
    }
    return session.data.continuation[id];
};

/**
 * Check if there is a helma_continuation http parameter, and if so,
 * check if there is a matching continuation, and if so, invoke the continuation
 * and return null.
 */
var resume = function() {
    var continuationId = req.params.helma_continuation;
    if (continuationId && session.data.continuation) {
        var continuation = session.data.continuation[continuationId];
        if (continuation) {
            log.debug("Resuming continuation " + continuationId);
            try {
                // FIXME: continuations scope gets messed up after some time. dig we must.
                continuation();
                return true;
            } catch (e) {
                error(e);
                return true;
            }
        }
    }
    return false;
}
