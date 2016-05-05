/*
 *  Copyright 1998-2006 Helma Project
 *  Copyright 2010 Hannes Wallnöfer
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * @fileoverview Adds utility functions for working with JavaScript Objects
 */

export("clone", "merge");

/**
 * Copies the properties of an object into a target object.
 * @param {Object} object the object to clone
 * @param {Object} cloned optional clone object
 * @param {Boolean} recursive pass true to create a deep clone. Otherwise a shallow clone is created.
 * @returns {Object} the clone object
 * @example let objects = require("ringo/utils/objects");
 * let a = [1, 2, 3];
 * let b = {"a": a};
 * let c = {};
 *
 * // shallow clone: b.a and c.a will share the same array
 * objects.clone(b, c);
 *
 * // this modifies all three: a, b.a, and c.a
 * b.a[0] = 99;
 * console.dir(a); // --> [ 99, 2, 3 ]
 * console.dir(b); // --> { a: [ 99, 2, 3 ] }
 * console.dir(c); // --> { a: [ 99, 2, 3 ] }
 *
 * // reset to original values
 * a = [1, 2, 3];
 * b = {"a": a};
 * c = {};
 *
 * // c is now a deep clone of b
 * objects.clone(b, c, true);
 *
 * // this modifies only a and b.a
 * b.a[0] = 99;
 *
 * console.dir(a); // --> [ 99, 2, 3 ]
 * console.dir(b); // --> { a: [ 99, 2, 3 ] }
 *
 * // c.a stays untouched, holds the original values
 * console.dir(c); // --> { a: [ 1, 2, 3 ] }
 */
function clone(object, cloned, recursive) {
    if (!cloned) {
        cloned = new object.constructor();
    }
    var value;
    for (var id in object) {
        if (!object.hasOwnProperty(id)) continue;
        value = object[id];
        if (recursive && value &&
                (value.constructor == Object || value.constructor == Array)) {
            cloned[id] = clone(value, new value.constructor(), recursive);
        } else {
            cloned[id] = value;
        }
    }
    return cloned;
}

/**
 * Creates a new object as the as the keywise union of the provided objects.
 * Whenever a key exists in a later object that already existed in an earlier
 * object, the according value of the earlier object takes precedence.
 * @param {Object...} obj... The objects to merge
 * @example const a = { "k1": "val-A" };
 * const b = { "k1": "val-B", "k2": "val-B" };
 * const c = { "k1": "val-C", "k2": "val-C" };
 *
 * // result: { k1: 'val-A', k2: 'val-B' }
 * const result = objects.merge(a, b, c);
 */
function merge() {
    var result = {};
    for (var i = arguments.length; i > 0; --i) {
        var obj = arguments[i - 1];
        for (var id in obj) {
            if (!obj.hasOwnProperty(id)) continue;
            result[id] = obj[id];
        }
    }
    return result;
}

