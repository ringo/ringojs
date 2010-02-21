
include('ringo/unittest');
include("binary");

exports.testByteArraySlice = function() {
    var a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    var b = new ByteArray(a);
    var s = b.slice();
    assertTrue(s instanceof ByteArray);
    assertEqual(10, s.length);
    assertEqual(a, s.toArray());

    s = b.slice(3, 6);
    assertTrue(s instanceof ByteArray);
    assertEqual(3, s.length);
    assertEqual(a.slice(3, 6), s.toArray());

    s = b.slice(3, 4);
    assertTrue(s instanceof ByteArray);
    assertEqual(1, s.length);
    assertEqual(a.slice(3, 4), s.toArray());

    s = b.slice(3, 3);
    assertTrue(s instanceof ByteArray);
    assertEqual(0, s.length);
    assertEqual(a.slice(3, 3), s.toArray());

    s = b.slice(3, 2);
    assertTrue(s instanceof ByteArray);
    assertEqual(0, s.length);
    assertEqual(a.slice(3, 2), s.toArray());

    s = b.slice(7);
    assertTrue(s instanceof ByteArray);
    assertEqual(3, s.length);
    assertEqual(a.slice(7), s.toArray());

    s = b.slice(3, -2);
    assertTrue(s instanceof ByteArray);
    assertEqual(5, s.length);
    assertEqual(a.slice(3, -2), s.toArray());

    s = b.slice(-2);
    assertTrue(s instanceof ByteArray);
    assertEqual(2, s.length);
    assertEqual(a.slice(-2), s.toArray());

    s = b.slice(50);
    assertTrue(s instanceof ByteArray);
    assertEqual(0, s.length);
    assertEqual(a.slice(50), s.toArray());

    s = b.slice(-100, 100);
    assertTrue(s instanceof ByteArray);
    assertEqual(10, s.length);
    assertEqual(a.slice(-100, 100), s.toArray());

    s = b.slice("foo");
    assertTrue(s instanceof ByteArray);
    assertEqual(10, s.length);
    assertEqual(a.slice("foo"), s.toArray());

    s = b.slice("foo", "bar");
    assertTrue(s instanceof ByteArray);
    assertEqual(0, s.length);
    assertEqual(a.slice("foo", "bar"), s.toArray());
};

if (require.main === module.id) {
    run(exports);
}
