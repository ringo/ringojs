include('helma.unittest');
require('core.object');

var c = new TestCase('core.object');

c.testMerge = function() {
    var x = {a: 1, b: 2};
    var y = {b: 3, c: 4};
    var z = {c: 5, d: 6};

    // degenerate zero/single-argument cases
    assertEqualObjects(Object.merge(),          {});
    assertEqualObjects(Object.merge(x),         {a: 1, b: 2});

    // property values of "earlier" arguments are promoted into the result
    assertEqualObjects(Object.merge(x, y),      {a: 1, b: 2, c: 4});
    assertEqualObjects(Object.merge(y, x),      {b: 3, c: 4, a: 1});

    assertEqualObjects(Object.merge(x, y, z),   {a: 1, b: 2, c: 4, d: 6});
    assertEqualObjects(Object.merge(y, z, x),   {b: 3, c: 4, d: 6, a: 1});
    assertEqualObjects(Object.merge(z, x, y),   {c: 5, d: 6, a: 1, b: 2});

    // check that the objects passed as arguments were not modified
    assertEqualObjects(x,                       {a: 1, b: 2});
    assertEqualObjects(y,                       {b: 3, c: 4});
    assertEqualObjects(z,                       {c: 5, d: 6});
};
