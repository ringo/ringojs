
include('helma/unittest');
include("binary");

exports.testByteArrayConstructor = function() {
    var testArray = [1,2,3,4],
        b;
    
    // ByteArray()
    // New, empty ByteArray.
    b = new ByteArray();
    //assertTrue(b instanceof Binary, "not instanceof Binary");
    assertTrue(b instanceof ByteArray, "not instanceof ByteArray");
    assertEqual(0, b.length);
    b.length = 123;
    assertEqual(123, b.length);
    assertEqual(0, b.get(4));
    
    // ByteArray(length)
    // New ByteArray filled with length zero bytes.
    b = new ByteArray(10);
    assertEqual(10, b.length);
    for (var i = 0; i < 10; i++)
        assertEqual(0, b.get(i));
    assertNaN(b.get(10));
    b.length = 234;
    assertEqual(234, b.length);
    assertEqual(0, b.get(10));
    assertEqual(0, b.get(233));
    assertNaN(b.get(234));
    
    // ByteArray(byteString)
    // Copy contents of byteString.
    b = new ByteArray(new ByteString(testArray));
    assertEqual(testArray.length, b.length);
    b.length = 345;
    assertEqual(345, b.length);
    assertEqual(1, b.get(0));
    assertEqual(4, b.get(3));
    assertEqual(0, b.get(4));
    
    // ByteArray(byteArray)
    // Copy byteArray.
    b = new ByteArray(new ByteArray(testArray));
    assertEqual(testArray.length, b.length);
    b.length = 456;
    assertEqual(456, b.length);
    assertEqual(1, b.get(0));
    assertEqual(4, b.get(3));
    assertEqual(0, b.get(4));
    
    // ByteArray(arrayOfBytes)
    // Use numbers in arrayOfBytes as contents.
    // Throws an exception if any element is outside the range 0...255 (TODO).
    b = new ByteArray(testArray);
    assertEqual(testArray.length, b.length);
    b.length = 567;
    assertEqual(567, b.length);
    assertEqual(1, b.get(0));
    assertEqual(4, b.get(3));
    assertEqual(0, b.get(4));
};

exports.testByteArrayResizing = function() {
    var b1 = new ByteArray([0,1,2,3,4,5,6]);
    assertEqual(7, b1.length);
    assertNaN(b1.get(7));
    
    b1.length = 10;
    assertEqual(10, b1.length, "Length should change to 10");
    assertEqual(5, b1.get(5));
    assertEqual(0, b1.get(7));
    
    b1.length = 3;
    assertEqual(3, b1.length, "Length should change to 10");
    assertEqual(0, b1.get(0));
    assertNaN(b1.get(4));
    
    b1.length = 9;
    assertEqual(9, b1.length, "Length should change to 9");
    assertEqual(0, b1.get(0));
    assertEqual(0, b1.get(4));
};

exports.testToByteArray = function() {
    var b1 = new ByteArray([1,2,3]),
        b2 = b1.toByteArray();
        
    assertTrue(b2 instanceof ByteArray, "not instanceof ByteArray");
    assertEqual(b1.length, b2.length);
    assertEqual(b1.get(0), b2.get(0));
    assertEqual(b1.get(2), b2.get(2));
    
    assertEqual(1, b1.get(0));
    assertEqual(1, b2.get(0));
    
    b1.set(0, 10);
    
    assertEqual(10, b1.get(0));
    assertEqual(1, b2.get(0));
};

exports.testToByteString = function() {
    var b1 = new ByteArray([1,2,3]),
        b2 = b1.toByteString();
        
    assertEqual(b1.length, b2.length);
    assertEqual(b1.get(0), b2.get(0));
    assertEqual(b1.get(2), b2.get(2));
    
    assertEqual(1, b1.get(0));
    assertEqual(1, b2.get(0));
    
    b1.set(0, 10);
    
    assertEqual(10, b1.get(0));
    assertEqual(1, b2.get(0));
};

exports.testToArray = function() {
    var testArray = [0,1,254,255],
        b1 = new ByteArray(testArray),
        a1 = b1.toArray();
          
    assertEqual(testArray.length, a1.length);
    for (var i = 0; i < testArray.length; i++)
        assertEqual(testArray[i], a1[i]);
};

exports.testToString = function() {
    // the format of the resulting string isn't specified, but it shouldn't be the decoded string
    // TODO: is this an ok test?
    
    var testString = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"+
                     "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        testArray = [];
    for (var i = 0; i < 128; i++) testArray.push(65);
    
    var resultString = new ByteArray(testArray).toString();
    
    assertTrue(resultString.length < 100);
    assertTrue(resultString !== testString);
};

exports.testIndexOf = function() {
    var b1 = new ByteArray([0,1,2,3,4,5,0,1,2,3,4,5]);
    
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
    var b1 = new ByteArray([0,1,2,3,4,5,0,1,2,3,4,5]);

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

exports.testByteArrayReverse = function() {
    var testArray = [0,1,2,3,4,5,6];
    
    var b1 = new ByteArray(testArray),
        b2 = b1.reverse();
    
    assertEqual(b1, b2);
    assertEqual(b1.length, b2.length);
    for (var i = 0; i < testArray.length; i++)
        assertEqual(testArray[i], b2.get(testArray.length-i-1));

    testArray = [0,1,2,3,4,5,6,7];

    b1 = new ByteArray(testArray);
    b2 = b1.reverse();

    assertEqual(b1, b2);
    assertEqual(b1.length, b2.length);
    for (var i = 0; i < testArray.length; i++)
        assertEqual(testArray[i], b2.get(testArray.length-i-1));
};

exports.testByteArraySort = function() {
    var testArray = [];
    for (var i = 0; i < 1000; i++)
        testArray.push(Math.floor(Math.random()*256));

    var a = new ByteArray(testArray);
    a.sort();
    
    for (var i = 1; i < a.length; i++)
        assertTrue(a.get(i-1) <= a.get(i), "index="+i+"("+a.get(i-1)+","+a.get(i)+")");    
};

exports.testByteArraySortCustom = function() {
    var testArray = [];
    for (var i = 0; i < 1000; i++)
        testArray.push(Math.floor(Math.random()*256));

    var a = new ByteArray(testArray);
    a.sort(function(o1, o2) { return o2-o1; });

    for (var i = 1; i < a.length; i++)
        assertTrue(a.get(i-1) >= a.get(i), "index="+i+"("+a.get(i-1)+","+a.get(i)+")");
};

exports.testSplit = function() {
    var b1 = new ByteArray([0,1,2,3,4,5]), a1;
    
    a1 = b1.split([]);
    assertEqual(1, a1.length);
    assertTrue(a1[0] instanceof ByteArray);
    assertEqual(6, a1[0].length);
    assertEqual(0, a1[0].get(0));
    assertEqual(5, a1[0].get(5));
    
    a1 = b1.split([2]);
    assertEqual(2, a1.length);
    assertTrue(a1[0] instanceof ByteArray);
    assertEqual(2, a1[0].length);
    assertEqual(0, a1[0].get(0));
    assertEqual(1, a1[0].get(1));
    assertEqual(3, a1[1].length);
    assertEqual(3, a1[1].get(0));
    assertEqual(5, a1[1].get(2));
    
    a1 = b1.split([2], { includeDelimiter : true });
    assertEqual(3, a1.length);
    assertTrue(a1[0] instanceof ByteArray);
    assertEqual(2, a1[0].length);
    assertEqual(0, a1[0].get(0));
    assertEqual(1, a1[0].get(1));
    assertEqual(1, a1[1].length);
    assertEqual(2, a1[1].get(0));
    assertEqual(3, a1[2].length);
    assertEqual(3, a1[2].get(0));
    assertEqual(5, a1[2].get(2));
    
    a1 = b1.split(new ByteArray([2,3]));
    assertEqual(2, a1.length);
    assertTrue(a1[0] instanceof ByteArray);
    assertEqual(2, a1[0].length);
    assertEqual(0, a1[0].get(0));
    assertEqual(1, a1[0].get(1));
    assertEqual(2, a1[1].length);
    assertEqual(4, a1[1].get(0));
    assertEqual(5, a1[1].get(1));
};

exports.testByteArrayForEach = function() {
    
    var b = new ByteArray([2, 3, 4, 5]),
        log = [],
        item;
    
    var thisObj = {};
    
    b.forEach(function() {
        log.push({
            thisObj: this,
            args: arguments
        });
    }, thisObj);
    
    assertEqual(4, log.length, "block called for each item");

    item = log[0];
    assertTrue(thisObj === item.thisObj, "block called with correct thisObj");
    assertEqual(3, item.args.length, "block called with three args");
    assertEqual(b.get(0), item.args[0], "block called with correct item 0");
    
    item = log[3];
    assertEqual(b.get(3), item.args[0], "block called with correct item 3");
    
    
};

exports.testByteArrayConcat = function() {

    var b = new ByteArray();
    
    var b1 = b.concat(new ByteArray([1,2,3]));
    assertEqual(3, b1.length);
    assertEqual(1, b1.get(0));
    assertEqual(2, b1.get(1));
    assertEqual(3, b1.get(2));
    
    var b2 = b1.concat(new ByteString([4,5,6]));
    assertEqual(6, b2.length);
    assertEqual(1, b2.get(0));
    assertEqual(3, b2.get(2));
    assertEqual(4, b2.get(3));
    assertEqual(6, b2.get(5));
    
    var b3 = b2.concat(b, b1, b2, new ByteString(), new ByteArray());
    assertEqual(b.length + b1.length + b2.length + b2.length, b3.length);
    
};


if (require.main === module.id) {
    run(exports);
}
