/*
 * This script demonstrates chaining of promise handlers.
 * If a promise handler returns a non-promise value, it is directly
 * passed on to the next promise handler in the chain. If it returns
 * a promise, the value of the promise is passed on to the next handler
 * in the chain as soon as it is resolved.
 */

const {Deferred} = require('ringo/promise');

const deferred = new Deferred();

deferred.promise.then(val => {
    print('Step 1:', val);
    return val.toUpperCase();
}).then(val => {
    print('Step 2:', val);
    const d = new Deferred();
    d.resolve(val.split(' ').join(' CRUEL '));
    return d.promise;
}).then(val => {
    print('Step 3:', val);
}, err => {
    print('Failed:', err);
});


deferred.resolve('hello world');
