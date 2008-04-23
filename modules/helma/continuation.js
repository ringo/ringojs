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
Continuation.nextUrl = function() {
    return req.path + "?helma_continuation=" + Continuation.nextId();
};

/**
 * Stop current execution and register continuation for later resumption.
 */
Continuation.nextPage = function() {
    // capture continuation and store it in callback container
    setCallback(Continuation.nextId(), new Continuation());
        // trick to exit current context: call empty continuation
    new org.mozilla.javascript.continuations.Continuation()();
};

// Private helper functions

var generateId = function() {
    var id;
    do {
        id = Math.ceil(Math.random() * Math.pow(2, 64)).toString(36);
    } while (getCallback(id));
    return id;
}

var setCallback = function(id, func) {
    if (!session.data.continuation) {
        session.data.continuation = {};
    }
    session.data.continuation[id] = func;
};

var getCallback = function(id) {
    if (!session.data.continuation || !session.data.continuation[id]) {
        return null;
    }
    return session.data.continuation[id];
};
