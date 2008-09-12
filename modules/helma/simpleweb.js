/**
 * A minimalist web framework that handles requests and provides
 * skin rendering services similar to helma 1, just that
 * module scopes replace hopobject hierarchies.
 */

loadModule('core.string');
loadModule('helma.simpleweb.*');
var continuation = loadModule('helma.continuation');
var rhino = loadModule('helma.rhino');

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
    // install req, res and session as per-thread globals
    putThreadLocal("req", req);
    putThreadLocal("res", res);
    putThreadLocal("session", session);
    // invoke onRequest
    rhino.invokeCallback('onRequest', null, [req]);
    // set default content type
    res.contentType = "text/html; charset=UTF-8";
    // resume continuation?
    if (continuation.resume()) {
        return;
    }
    // resolve path and invoke action
    var path = req.path.split('/');
    var handler = this;
    // first element is always empty string if path starts with '/'
    for (var i = 1; i < path.length -1; i++) {
        handler = handler[path[i]];
        if (!handler) {
            notfound();
            return;
        }
    }
    var lastPart = path[path.length - 1];
    var action = lastPart ?
                 lastPart.replace('.', '_', 'g') + '_action' :
                 'main_action';
    // res.writeln(handler, action, handler[action]);
    if (!(handler[action] instanceof Function)) {
        if (!req.path.endsWith('/') && handler[lastPart] &&
            handler[lastPart]['main_action'] instanceof Function) {
            res.redirect(req.path + '/');
        } else if (!handler[action]) {
            notfound();
            return
        }
    }
    try {
        handler[action].call(handler);
    } catch (e) {
        error(e);
    } finally {
        rhino.invokeCallback('onResponse', null, [res]);
    }
}

/**
 * Standard error page
 * @param e the error that happened
 */
function error(e) {
    res.status = 500;
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
    res.status = 404;
    res.contentType = 'text/html';
    res.writeln('<h1>Not Found</h1>');
    res.writeln('The requested URL', req.path, 'was not found on the server.');
    return null;
}


