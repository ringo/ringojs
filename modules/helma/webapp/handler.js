/**
 * The Helma web application framework
 */

loadModule('core.string');
loadModule('helma.webapp.request');
loadModule('helma.webapp.response');
var continuation = loadModule('helma.webapp.continuation');
var system = loadModule('helma.system');

/**
 * Handler function that connects to the Helma servlet. Import this
 * into your main module scope:
 *
 * <code>importFromModule('helma.simpleweb', 'handleRequest');</code>
 *
 * @param req
 * @param res
 */
function handleRequest(req, res) {
    // install req, res and session as per-thread globals
    /*putThreadLocal("req", req);
    putThreadLocal("res", res);
    putThreadLocal("session", session);*/
    // invoke onRequest
    system.invokeCallback('onRequest', null, [req]);
    // set default content type
    res.contentType = "text/html; charset=UTF-8";
    // resume continuation?
    if (continuation.resume(req, res)) {
        return;
    }
    // resolve path and invoke action
    var path = req.path.split('/');
    var handler = this;
    // first element is always empty string if path starts with '/'
    for (var i = 1; i < path.length -1; i++) {
        handler = handler[path[i]];
        if (!handler) {
            notfound(req, res);
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
            notfound(req, res);
            return
        }
    }
    try {
        handler[action].call(handler, req, res);
    } catch (e) {
        error(req, res, e);
    } finally {
        system.invokeCallback('onResponse', null, [res]);
    }
}

/**
 * Standard error page
 * @param e the error that happened
 */
function error(req, res, e) {
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
function notfound(req, res) {
    res.status = 404;
    res.contentType = 'text/html';
    res.writeln('<h1>Not Found</h1>');
    res.writeln('The requested URL', req.path, 'was not found on the server.');
    return null;
}


