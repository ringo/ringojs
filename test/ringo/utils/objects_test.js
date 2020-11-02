// objects.clone() and tests ported from the node-clone module
//
// Original work copyright 2011-2015 Paul Vorbach and contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the “Software”), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
// - The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// - THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// https://github.com/pvorb/node-clone/blob/master/LICENSE
// http://paul.vorba.ch/ and https://github.com/pvorb/node-clone/graphs/contributors

const assert = require('assert');
const {merge, clone} = require('ringo/utils/objects');

exports.testMerge = function() {
    const x = {a: 1, b: 2};
    const y = {b: 3, c: 4};
    const z = {c: 5, d: 6};

    // degenerate zero/single-argument cases
    assert.deepEqual(merge(), {});
    assert.deepEqual(merge(x), {a: 1, b: 2});

    // property values of "earlier" arguments are promoted into the result
    assert.deepEqual(merge(x, y), {a: 1, b: 2, c: 4});
    assert.deepEqual(merge(y, x), {b: 3, c: 4, a: 1});

    assert.deepEqual(merge(x, y, z), {a: 1, b: 2, c: 4, d: 6});
    assert.deepEqual(merge(y, z, x), {b: 3, c: 4, d: 6, a: 1});
    assert.deepEqual(merge(z, x, y), {c: 5, d: 6, a: 1, b: 2});

    // check that the objects passed as arguments were not modified
    assert.deepEqual(x, {a: 1, b: 2});
    assert.deepEqual(y, {b: 3, c: 4});
    assert.deepEqual(z, {c: 5, d: 6});
};

exports.testCloneNumber = function() {
    let a = 0;
    assert.strictEqual(clone(a), a);
    a = 1;
    assert.strictEqual(clone(a), a);
    a = -1000;
    assert.strictEqual(clone(a), a);
    a = 3.1415927;
    assert.strictEqual(clone(a), a);
    a = -3.1415927;
    assert.strictEqual(clone(a), a);
};

exports.testCloneDate = function() {
    const a = new Date();
    const c = clone(a);
    assert.isTrue(!!a.getUTCDate && !!a.toUTCString);
    assert.isTrue(!!c.getUTCDate && !!c.toUTCString);
    assert.strictEqual(a.getTime(), c.getTime());
};

exports.testCloneObject = function() {
    const a = { foo: { bar: "baz" } };
    const b = clone(a);
    assert.deepEqual(b, a);
};

assert.testCloneArray = function() {
    const a = [
        { foo: "bar" },
        "baz"
    ];
    const b = clone(a);
    assert.isTrue(b instanceof Array);
    assert.deepEqual(b, a);
};

exports.testCloneRegExp = function() {
    const a = /abc123/gi;
    const b = clone(a);
    assert.deepEqual(b, a);

    const c = /a/g;
    assert.isTrue(c.lastIndex === 0);

    c.exec('123a456a');
    assert.isTrue(c.lastIndex === 4);

    const d = clone(c);
    assert.isTrue(d.global);
    assert.isTrue(d.lastIndex === 4);
};

exports.testCloneObjectWithArray = function() {
    const a = {
        arr1: [ { a: '1234', b: '2345' } ],
        arr2: [ { c: '345', d: '456' } ]
    };

    const b = clone(a);
    assert.deepEqual(b, a);
};

exports.testCloneCircularReferences = function() {
    const inspect = (obj) => {
        const seen = [];
        return JSON.stringify(obj, function (key, val) {
            if (val !== null && typeof val == "object") {
                if (seen.indexOf(val) >= 0) {
                    return '[cyclic]';
                }
                seen.push(val);
            }
            return val;
        });
    };
    const eq = (x, y) => {
        return inspect(x) === inspect(y);
    };

    const c = [1, "foo", {'hello': 'bar'}, function () {}, false, [2]];
    const b = [c, 2, 3, 4];

    const a = {'b': b, 'c': c};
    a.loop = a;
    a.loop2 = a;
    c.loop = c;
    c.aloop = a;

    const aCopy = clone(a);
    assert.isTrue(a !== aCopy);
    assert.isTrue(a.c !== aCopy.c);
    assert.isTrue(aCopy.c === aCopy.b[0]);
    assert.isTrue(aCopy.c.loop.loop.aloop === aCopy);
    assert.isTrue(aCopy.c[0] === a.c[0]);

    assert.isTrue(eq(a, aCopy));
    aCopy.c[0] = 2;
    assert.isTrue(!eq(a, aCopy));
    aCopy.c = "2";
    assert.isTrue(!eq(a, aCopy));
};

exports.testCloneObjectsWithoutConstructor = function() {
    const n = null;

    const a = { foo: 'bar' };
    a.__proto__ = n;
    assert.isTrue(typeof a === 'object');
    assert.isTrue(typeof a !== null);

    const b = clone(a);
    assert.strictEqual(a.foo, b.foo);
};

exports.testCloneWithDeep = function() {
    const a = {
        foo: {
            bar : {
                baz : 'qux'
            }
        }
    };

    let b = clone(a, false, 1);
    assert.deepEqual(b, a);
    assert.notEqual(b, a);
    assert.strictEqual(b.foo, a.foo);

    b = clone(a, true, 2);
    assert.deepEqual(b, a);
    assert.notEqual(b.foo, a.foo);
    assert.strictEqual(b.foo.bar, a.foo.bar);
};

exports.testCloneWithPrototype = function() {
    const T = function() {};

    const a = new T();
    const b = clone(a);
    assert.strictEqual(Object.getPrototypeOf(a), Object.getPrototypeOf(b));
};

exports.testCloneWithProvidedPrototype = function() {
    const T = function() {};

    const a = new T();
    const b = clone(a, true, Infinity, null);
    assert.strictEqual(b.__defineSetter__, undefined);
};

exports.testCloneWithNullChildren = function() {
    const a = {
        foo: {
            bar: null,
            baz: {
                qux: false
            }
        }
    };

    const b = clone(a);
    assert.deepEqual(b, a);
};

exports.testCloneWithGetter = function() {
    const Ctor = function() {};
    Object.defineProperty(Ctor.prototype, 'prop', {
        configurable: true,
        enumerable: true,
        get: () => {
            return 'value';
        }
    });

    const a = new Ctor();
    const b = clone(a);

    assert.strictEqual(b.prop, 'value');
};

exports.testCloneOldBehaviour = function() {
    let a = [1, 2, 3];
    let b = {"a": a};
    let c = {};

    // shallow clone: b.a and c.a will share the same array
    assert.throws(function() {
        clone(b, c);
    });

    c = clone(b);

    // this modifies all three: a, b.a, and c.a
    b.a[0] = 99;
    assert.deepEqual(a, [ 99, 2, 3 ]);
    assert.deepEqual(b, { a: [ 99, 2, 3 ]});

    // reset to original values
    a = [1, 2, 3];
    b = {"a": a};
    c = {};

    // c is now a deep clone of b
    assert.throws(function() {
        clone(b, c, true);
    });

    c = clone(b);

    // this modifies only a and b.a
    b.a[0] = 99;

    assert.deepEqual(a, [ 99, 2, 3 ]);
    assert.deepEqual(b, { a: [ 99, 2, 3 ]});

    // c.a stays untouched, holds the original values
    assert.deepEqual(c, { a: [ 1, 2, 3 ] });
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}
