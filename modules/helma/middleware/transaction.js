
export('handleRequest');

/**
 * Middleware for automatic transaction support
 * @param req the HTTP request
 * @return the HTTP response object
 */
function handleRequest(req) {
    var store = require('helma/webapp/env').config.store;
    if (!store || typeof(store.beginTransaction) != 'function') {
        return req.process;
    }
    print(store.beginTransaction());
    try {
        var res = req.process();
        store.commitTransaction();
        return res;
    } catch (e) {
        store.abortTransaction();
        throw e;
    }
}
