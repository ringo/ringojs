/**
 * A minimalist web framework that handles requests and provides
 * skin rendering services similar to helma 1, just that
 * module scopes replace hopobject hierarchies.
 */

/**
 * Handler function that connects to the Helma servlet. Import this
 * into your main module scope:
 *
 * <code>importFromModule('helma.simpleweb', 'handleRequest');</code>
 *
 * @param req
 * @param res
 * @param session
 */
function handleRequest(req, res, session) {
    // install req, res and session as globals
    global.req = req;
    global.res = res;
    global.session = session;
    res.contentType = "text/html; charset=UTF-8";
    // resume continuation?
    var continuationId = req.params.helma_continuation;
    if (continuationId && session.data.continuation) {
        var continuation = session.data.continuation[continuationId];
        if (continuation)
            return continuation();
    }
    // resolve path and invoke action
    var path = req.path.split('/');
    var handler = this;
    // first element is always empty string if path starts with '/'
    for (var i = 1; i < path.length -1; i++) {
        handler = handler[path[i]];
        if (!handler) {
            return notfound();
        }
    }
    var action = path[path.length - 1];
    if (!action) {
        action = "main_action";
    } else {
        action += "_action";
    }
    // res.writeln(handler, action, handler[action]);
    if (!handler[action] || !(handler[action] instanceof Function)) {
        return notfound();
    }
    try {
        handler[action].call(handler);
    } catch (e) {
        error(e);
    }
    return null;
}

/**
 * Standard error page
 * @param e the error that happened
 */
function error(e) {
    res.contentType = 'text/html';
    res.writeln('<h2>', e, '</h2>');
    if (e.fileName && e.lineNumber) {
        res.writeln('<p>In file<b>', e.fileName, '</b>at line<b>', e.lineNumber, '</b></p>');
    }
    if (e.rhinoException) {
        res.writeln('<h3>Script Stack</h3>');
        res.writeln('<pre>', e.rhinoException.scriptStackTrace, '</pre>');
        res.writeln('<h3>Java Stack</h3>');
        var writer = new java.io.StringWriter();
        var printer = new java.io.PrintWriter(writer);
        e.rhinoException.printStackTrace(printer);
        res.writeln('<pre>', writer.toString(), '</pre>');
    }
    return null;
}

/**
 * Standard notfound page
 */
function notfound() {
    res.contentType = 'text/html';
    res.writeln('<h1>Not Found</h1>');
    res.writeln('The requested URL', req.path, 'was not found on the server.');
    return null;
}

