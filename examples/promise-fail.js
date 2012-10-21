/*
 * This example demonstrates chaining of error handlers with promises.
 * An error thrown by the first promise handler is passed on to the 
 * error handler at the end of the chain.
 */

var {Deferred} = require('ringo/promise');

var deferred = new Deferred();

deferred.promise.then(function(val) {
    print('Step 1:', val);
    throw 'Error';
}).then(function(val) {
    print('Step 2', val);
    return val.toUpperCase();
}).then(function(val) {
    print('Step 3:', val);
}, function(err) {
    print('Failed:', err);
});


deferred.resolve('hello world');
