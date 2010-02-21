include("ringo/unittest");
var shell = require("ringo/shell");

exports.testAssertTrue = function() {
    assertTrue(true);
    return;
};

exports.testAssertFalse = function() {
    assertFalse(false);
    return;
};

exports.testAssertEqual = function() {
    // primitives
    assertEqual(true, true);
    assertEqual(1, 1);
    assertEqual("one", "one");
    assertEqual(NaN, NaN);
    assertEqual(undefined, undefined);
    assertEqual(null, null);

    // arrays
    assertEqual([], []);
    assertEqual(["one"], ["one"]);
    assertEqual(["one", "two"], ["one", "two"]);

    // objects
    assertEqual({}, {});
    assertEqual({a: 1}, {a: 1});
    assertEqual({a: 1, b: 2}, {a: 1, b: 2});
    assertEqual({a: 1, b: 2}, {b: 2, a: 1});
    assertEqual({a: {b: 1}}, {a: {b: 1}});

    // regexp
    assertEqual(/^test.*/, /^test.*/);
    assertEqual(/^test.*/gim, /^test.*/gim);

    // dates
    var date1 = new Date(2009, 5, 6, 12, 31, 27);
    var date2 = new Date(date1.getTime());
    assertEqual(date1, date2);
    // functions
    var func1 = function() {
        var x = 0;
        x += 1;
        return;
    };
    var func2 = function() {
        var x = 0;
        x += 1;
        return;
    };
    assertEqual(func1, func2);
    return;
};

exports.testAssertNotEqual = function() {
    // primitives
    assertNotEqual(true, false);
    assertNotEqual(true, "true");
    assertNotEqual(true, 1);
    assertNotEqual("one", true);
    assertNotEqual(1, true);
    return;
};

exports.testAssertNull = function() {
    assertNull(null);
    return;
};

exports.testAssertNotNull = function() {
    assertNotNull(0);
    assertNotNull("");
    assertNotNull(undefined);
    assertNotNull("0");
    return;
};

exports.testAssertUndefined = function() {
    assertUndefined(undefined);
    return;
};

exports.testAssertNotUndefined = function() {
    assertNotUndefined(null);
    return;
};

exports.testAssertNaN = function() {
    assertNaN("a");
    return;
};

exports.testAssertNotNaN = function() {
    assertNotNaN(1);
    return;
};

exports.testAssertStringContains = function() {
    assertStringContains("just a test", "test");
    return;
};

exports.testAssertMatch = function() {
    assertMatch("just a test", /t.?st/);
    return;
};

exports.testAssertThrows = function() {
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



/***** jsDump tests *****/



exports.testDumpObject = function() {
    assertEqual(
        jsDump({
            "a": 1,
            "b": {
                "c": 2
            },
            "e": 23
        }),
        [
            '{',
            '    "a": 1,',
            '    "b": {',
            '        "c": 2',
            '    },',
            '    "e": 23',
            '}'
        ].join("\n")
    );
    return;
};

exports.testDumpSimpleArray = function() {
    assertEqual(
        jsDump([0, "eins", 2, 3]),
        [
            '[',
            '    0,',
            '    "eins",',
            '    2,',
            '    3',
            ']'
        ].join("\n")
    );
    return;
};

exports.testDumpMultiDimensionalArray = function() {
    assertEqual(
        jsDump([0, "eins", ["a", ["one", "two"], "c"], 3]),
        [
            '[',
            '    0,',
            '    "eins",',
            '    [',
            '        "a",',
            '        [',
            '            "one",',
            '            "two"',
            '        ],',
            '        "c"',
            '    ],',
            '    3',
            ']'
        ].join("\n")
    );
    return;
};

exports.testDumpMixedArray = function() {
    assertEqual(
        jsDump([0, "eins", ["a", {"a": 0, "b": {"c": 3}, "d": 4}, "c"], 3]),
        [
            '[',
            '    0,',
            '    "eins",',
            '    [',
            '        "a",',
            '        {',
            '            "a": 0,',
            '            "b": {',
            '                "c": 3',
            '            },',
            '            "d": 4',
            '        },',
            '        "c"',
            '    ],',
            '    3',
            ']'
        ].join("\n")
    );
    return;
};

exports.testDumpString = function() {
    assertEqual(jsDump("one"), '"one"');
    assertEqual(jsDump("0"), '"0"');
    return;
};

exports.testDumpNumber = function() {
    assertEqual(jsDump(12), "12");
    assertEqual(jsDump(Infinity), "Infinity");
    return;
};

exports.testDumpNaN = function() {
    assertEqual(jsDump(NaN), "NaN");
    return;
};

exports.testDumpBoolean = function() {
    assertEqual(jsDump(true), "true");
    return;
};

exports.testDumpDate = function() {
    var d = new Date();
    assertEqual(jsDump(d), d.toString());
    return;
};

exports.testDumpRegExp = function() {
    var re = /^test(.*)/gim;
    assertEqual(jsDump(re), "/^test(.*)/gim");
    return;
};

exports.testDumpFunction = function() {
    assertEqual(jsDump(exports.testDumpObject), exports.testDumpObject.toSource());
    return;
};
