
export('handleRequest');

/**
 * Middleware for automatic transaction support
 * @param app the JSGI app
 * @return the wrapped JSGI app
 */
function handleRequest(app) {
    return function(env) {
        var store = require('helma/webapp/env').config.store;
        if (!store || typeof(store.beginTransaction) != 'function') {
            return req.process();
        }
        store.beginTransaction();
        try {
            var res = app(env);
            store.commitTransaction();
            return res;
        } catch (e) {
            store.abortTransaction();
            throw e;
        }
    }
}
