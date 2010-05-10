
include('ringo/unittest');
include("binary");


exports.testByteStringConstructor = function() {
    var testArray = [1,2,3,4];

    // ByteString()
    // Construct an empty byte string.
    var b1 = new ByteString();
    //assertTrue(b1 instanceof Binary, "not instanceof Binary");
    assertTrue(b1 instanceof ByteString, "not instanceof ByteString");
    assertEqual(0, b1.length);
    b1.length = 123;
    assertEqual(0, b1.length);

    // ByteString(byteString)
    // Copies byteString.
    var b2 = new ByteString(new ByteString(testArray));
    assertEqual(testArray.length, b2.length);
    b2.length = 123;
    assertEqual(testArray.length, b2.length);
    assertEqual(1, b2.get(0));
    assertEqual(4, b2.get(3));

    // ByteString(byteArray)
    // Use the contents of byteArray.
    var b2 = new ByteString(new ByteArray(testArray));
    assertEqual(testArray.length, b2.length);
    b2.length = 123;
    assertEqual(testArray.length, b2.length);
    assertEqual(1, b2.get(0));
    assertEqual(4, b2.get(3));

    // ByteString(arrayOfNumbers)
    // Use the numbers in arrayOfNumbers as the bytes.
    // If any element is outside the range 0...255, an exception (TODO) is
    // thrown.
    var b3 = new ByteString(testArray);
    assertEqual(testArray.length, b3.length);
    b3.length = 123;
    assertEqual(testArray.length, b3.length);
    assertEqual(1, b3.get(0));
    assertEqual(4, b3.get(3));
};

//exports.testByteStringJoin = function() {
//}

exports.testToByteArray = function() {
    var b1 = new ByteString([1,2,3]),
        b2 = b1.toByteArray();

    assertTrue(b2 instanceof ByteArray, "not instanceof ByteArray");
    assertEqual(b1.length, b2.length);
    assertEqual(b1.get(0), b2.get(0));
    assertEqual(b1.get(2), b2.get(2));
};

exports.testToByteString = function() {
    var b1 = new ByteString([1,2,3]),
        b2 = b1.toByteString();

    assertEqual(b1.length, b2.length);
    assertEqual(b1.get(0), b2.get(0));
    assertEqual(b1.get(2), b2.get(2));
};

exports.testToArray = function() {
    var testArray = [0,1,254,255],
        b1 = new ByteString(testArray),
        a1 = b1.toArray();

    assertEqual(testArray.length, a1.length);
    for (var i = 0; i < testArray.length; i++)
        assertEqual(testArray[i], a1[i]);
};

exports.testToString = function() {
    // the format of the resulting string isn't specified, but it shouldn't be
    // the decoded string
    // TODO: is this an ok test?

    var testString = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"+
                     "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        testArray = [];
    for (var i = 0; i < 128; i++) testArray.push(65);

    var resultString = new ByteString(testArray).toString();

    assertTrue(resultString.length < 100);
    assertTrue(resultString !== testString);
};

exports.testIndexOf = function() {
    var b1 = new ByteString([0,1,2,3,4,5,0,1,2,3,4,5]);

    assertEqual(-1, b1.indexOf(-1));

    assertEqual(0,  b1.indexOf(0));
    assertEqual(5,  b1.indexOf(5));
    assertEqual(-1, b1.indexOf(12));

    assertEqual(6,  b1.indexOf(0, 6));
    assertEqual(11,  b1.indexOf(5, 6));
    assertEqual(-1, b1.indexOf(12, 6));

    assertEqual(0,  b1.indexOf(0, 0, 3));
    assertEqual(-1,  b1.indexOf(5, 0, 3));
    assertEqual(-1, b1.indexOf(12, 0, 3));
};

exports.testLastIndexOf = function() {
    var b1 = new ByteString([0,1,2,3,4,5,0,1,2,3,4,5]);

    assertEqual(-1, b1.lastIndexOf(-1));

    assertEqual(6,  b1.lastIndexOf(0));
    assertEqual(11,  b1.lastIndexOf(5));
    assertEqual(-1, b1.lastIndexOf(12));

    assertEqual(0,  b1.lastIndexOf(0, 0, 6));
    assertEqual(5,  b1.lastIndexOf(5, 0, 6));
    assertEqual(-1, b1.lastIndexOf(12, 0, 6));

    assertEqual(6,  b1.lastIndexOf(0, 6, 9));
    assertEqual(-1,  b1.lastIndexOf(5, 6, 9));
    assertEqual(-1, b1.lastIndexOf(12, 6, 9));
};

exports.testCharCodeAt = function() {
    var b1 = new ByteString([0,1,2,3,4,255]);

    assertTrue(isNaN(b1.charCodeAt(-1)));
    assertEqual(0, b1.charCodeAt(0));
    assertEqual(255, b1.charCodeAt(5));
    assertTrue(isNaN(b1.charCodeAt(6)));
};

// identical to charCodeAt, test anyway?
exports.testGet = function() {
    var b1 = new ByteString([0,1,2,3,4,255]);

    assertTrue(isNaN(b1.get(-1)));
    assertEqual(0, b1.get(0));
    assertEqual(255, b1.get(5));
    assertTrue(isNaN(b1.get(6)));
};

exports.testByteAt = function() {
    var b1 = new ByteString([0,1,2,3,4,255]), b2;

    b2 = b1.byteAt(-1);
    assertEqual(0, b2.length);
    b2 = b1.byteAt(0);
    assertEqual(1, b2.length);
    assertEqual(0, b2.get(0));
    b2 = b1.byteAt(5);
    assertEqual(1, b2.length);
    assertEqual(255, b2.get(0));
    b2 = b1.byteAt(6);
    assertEqual(0, b2.length);
};

// identical to byteAt, test anyway?
exports.testCharAt = function() {
    var b1 = new ByteString([0,1,2,3,4,255]), b2;

    b2 = b1.charAt(-1);
    assertEqual(0, b2.length);
    b2 = b1.charAt(0);
    assertEqual(1, b2.length);
    assertEqual(0, b2.get(0));
    b2 = b1.charAt(5);
    assertEqual(1, b2.length);
    assertEqual(255, b2.get(0));
    b2 = b1.charAt(6);
    assertEqual(0, b2.length);
};

exports.testSplit = function() {
    var b1 = new ByteString([0,1,2,3,4,5]), a1;

    a1 = b1.split([]);
    assertEqual(1, a1.length);
    assertTrue(a1[0] instanceof ByteString);
    assertEqual(6, a1[0].length);
    assertEqual(0, a1[0].get(0));
    assertEqual(5, a1[0].get(5));

    a1 = b1.split([2]);
    assertEqual(2, a1.length);
    assertTrue(a1[0] instanceof ByteString);
    assertEqual(2, a1[0].length);
    assertEqual(0, a1[0].get(0));
    assertEqual(1, a1[0].get(1));
    assertEqual(3, a1[1].length);
    assertEqual(3, a1[1].get(0));
    assertEqual(5, a1[1].get(2));

    a1 = b1.split([2], { includeDelimiter : true });
    assertEqual(3, a1.length);
    assertTrue(a1[0] instanceof ByteString);
    assertEqual(2, a1[0].length);
    assertEqual(0, a1[0].get(0));
    assertEqual(1, a1[0].get(1));
    assertEqual(1, a1[1].length);
    assertEqual(2, a1[1].get(0));
    assertEqual(3, a1[2].length);
    assertEqual(3, a1[2].get(0));
    assertEqual(5, a1[2].get(2));

    a1 = b1.split(new ByteString([2,3]));
    assertEqual(2, a1.length);
    assertTrue(a1[0] instanceof ByteString);
    assertEqual(2, a1[0].length);
    assertEqual(0, a1[0].get(0));
    assertEqual(1, a1[0].get(1));
    assertEqual(2, a1[1].length);
    assertEqual(4, a1[1].get(0));
    assertEqual(5, a1[1].get(1));
};

exports.testSlice = function() {
    var b1 = new ByteString([0,1,2,3,4,5]), b2;

    b2 = b1.slice();
    assertEqual(6, b2.length);
    assertEqual(0, b2.get(0));
    assertEqual(5, b2.get(5));

    b2 = b1.slice(0);
    assertEqual(6, b2.length);
    assertEqual(0, b2.get(0));
    assertEqual(5, b2.get(5));

    b2 = b1.slice(1, 4);
    assertEqual(3, b2.length);
    assertEqual(1, b2.get(0));
    assertEqual(3, b2.get(2));

    b2 = b1.slice(0, -1);
    assertEqual(5, b2.length);
    assertEqual(0, b2.get(0));
    assertEqual(4, b2.get(4));

    b2 = b1.slice(-3, -1);
    assertEqual(2, b2.length);
    assertEqual(3, b2.get(0));
    assertEqual(4, b2.get(1));

    b2 = b1.slice(9, 10);
    assertEqual(0, b2.length);
};

exports.testByteStringNewless = function () {
    assertEqual(1, ByteString([0]).length);
    // assertEqual(2, ByteString([0, 1], 0, 2).length);
};

if (require.main === module.id) {
    run(exports);
}
