include('ringo/unittest');
require('core/object');

exports.testMerge = function() {
    var x = {a: 1, b: 2};
    var y = {b: 3, c: 4};
    var z = {c: 5, d: 6};

    // degenerate zero/single-argument cases
    assertEqual(Object.merge(),          {});
    assertEqual(Object.merge(x),         {a: 1, b: 2});

    // property values of "earlier" arguments are promoted into the result
    assertEqual(Object.merge(x, y),      {a: 1, b: 2, c: 4});
    assertEqual(Object.merge(y, x),      {b: 3, c: 4, a: 1});

    assertEqual(Object.merge(x, y, z),   {a: 1, b: 2, c: 4, d: 6});
    assertEqual(Object.merge(y, z, x),   {b: 3, c: 4, d: 6, a: 1});
    assertEqual(Object.merge(z, x, y),   {c: 5, d: 6, a: 1, b: 2});

    // check that the objects passed as arguments were not modified
    assertEqual(x,                       {a: 1, b: 2});
    assertEqual(y,                       {b: 3, c: 4});
    assertEqual(z,                       {c: 5, d: 6});
};
