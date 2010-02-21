
export('handleRequest');

/**
 * Middleware for automatic transaction support
 * @param app the JSGI app
 * @returns the wrapped JSGI app
 */
function handleRequest(app) {
    return function(env) {
        // FIXME: we used to run after ringo/webapp so things used to be set up
        var store = require('config').store;
        if (!store || typeof(store.beginTransaction) != 'function') {
            return app(env);
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
