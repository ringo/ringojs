var assert = require('assert');
require('core/object');

exports.testMerge = function() {
    var x = {a: 1, b: 2};
    var y = {b: 3, c: 4};
    var z = {c: 5, d: 6};

    // degenerate zero/single-argument cases
    assert.deepEqual(Object.merge(),          {});
    assert.deepEqual(Object.merge(x),         {a: 1, b: 2});

    // property values of "earlier" arguments are promoted into the result
    assert.deepEqual(Object.merge(x, y),      {a: 1, b: 2, c: 4});
    assert.deepEqual(Object.merge(y, x),      {b: 3, c: 4, a: 1});

    assert.deepEqual(Object.merge(x, y, z),   {a: 1, b: 2, c: 4, d: 6});
    assert.deepEqual(Object.merge(y, z, x),   {b: 3, c: 4, d: 6, a: 1});
    assert.deepEqual(Object.merge(z, x, y),   {c: 5, d: 6, a: 1, b: 2});

    // check that the objects passed as arguments were not modified
    assert.deepEqual(x,                       {a: 1, b: 2});
    assert.deepEqual(y,                       {b: 3, c: 4});
    assert.deepEqual(z,                       {c: 5, d: 6});
};
