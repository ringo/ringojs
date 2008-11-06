include("helma.unittest");

var testCase = new TestCase("helma.unittest");

testCase.testAssertTrue = function() {
    assertTrue(true);
    return;
};

testCase.testAssertFalse = function() {
    assertFalse(false);
    return;
};

testCase.testAssertEqual = function() {
    assertEqual(true, true);
    return;
};

testCase.testAssertNotEqual = function() {
    assertNotEqual(true, false);
    return;
};

testCase.testAssertEqualArrays = function() {
    assertEqualArrays([], []);
    assertEqualArrays(["one"], ["one"]);
    assertEqualArrays(["one", "two"], ["one", "two"]);
    return;
}

testCase.testAssertEqualObjects = function() {
    assertEqualObjects({}, {});
    assertEqualObjects({a: 1}, {a: 1});
    assertEqualObjects({a: 1, b: 2}, {a: 1, b: 2});
    assertEqualObjects({a: 1, b: 2}, {b: 2, a: 1});
    return;
};

testCase.testAssertNull = function() {
    assertNull(null);
    return;
};

testCase.testAssertNotNull = function() {
    assertNotNull(0);
    assertNotNull("");
    assertNotNull(undefined);
    assertNotNull("0");
    return;
};

testCase.testAssertUndefined = function() {
    assertUndefined(undefined);
    return;
};

testCase.testAssertNotUndefined = function() {
    assertNotUndefined(null);
    return;
};

testCase.testAssertNaN = function() {
    assertNaN("a");
    return;
};

testCase.testAssertNotNaN = function() {
    assertNotNaN(1);
    return;
};

testCase.testAssertStringContains = function() {
    assertStringContains("just a test", "test");
    return;
};

testCase.testAssertMatch = function() {
    assertMatch("just a test", /t.?st/);
    return;
};

testCase.testAssertThrows = function() {
    // throw undefined (yes, you can do that...)
    assertThrows(function() {
        throw undefined;
    }, undefined);
    // throw Error instance
    assertThrows(function() {
        throw new Error("a message");
    }, Error);
    // throw string
    assertThrows(function() {
        throw "my message";
    }, "my message");
    // throw java exception
    assertThrows(function() {
        var x = new java.util.Vector(0);
        x.get(1);
    }, java.lang.ArrayIndexOutOfBoundsException);
    // throw anything, but don't check further
    assertThrows(function() {
        throw new Date();
    });
    return;
};
