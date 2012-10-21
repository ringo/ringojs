/*
 * This script demonstrates chaining of promise handlers.
 * If a promise handler returns a non-promise value, it is directly
 * passed on to the next promise handler in the chain. If it returns
 * a promise, the value of the promise is passed on to the next handler
 * in the chain as soon as it is resolved.
 */

var {Deferred} = require('ringo/promise');

var deferred = new Deferred();

deferred.promise.then(function(val) {
    print('Step 1:', val);
    return val.toUpperCase();
}).then(function(val) {
    print('Step 2:', val);
    var d = new Deferred();
    d.resolve(val.split(' ').join(' CRUEL '));
    return d.promise;
}).then(function(val) {
    print('Step 3:', val);
}, function(err) {
    print('Failed:', err);
});


deferred.resolve('hello world');
