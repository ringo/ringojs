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

// objects.clone() ported from the node-clone module
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

/**
 * Creates a deep clone (full copy) of the given object.
 *
 * It supports cloning objects with circular references by tracking visited properties.
 * Only if the object to clone cannot hold any circular reference by foreknowledge,
 * tracking can be turned off to save CPU and memory.
 *
 * @param {Object} object the object to clone
 * @param {Boolean} circular (optional, default true) true if the object to be cloned may contain circular references
 * @param {Number} depth (optional, default Infinity) limits the non-shallow clone of an object to a particular depth
 * @param {Object} prototype (optional) sets the prototype to be used when cloning an object
 * @returns {Object} the clone object
 * @see <a href="https://github.com/pvorb/node-clone/">node-clone</a>
 * @example let objects = require("ringo/utils/objects");
 * let a = [1, 2, 3];
 *
 * // shallow clone: b.a and c.a will share the same array
 * let b = objects.clone(a);
 * a[0] = 100;
 *
 * console.dir(a); // -> [ 100, 2, 3 ]
 * console.dir(b); // -> [ 1, 2, 3 ]
 *
 * let root = { simple: 1 };
 * let circle = { circ: root };
 * root.circle = circle;
 *
 * let copy = objects.clone(root);
 * console.dir(root); // -> { simple: 1, circle: { circ: [CyclicRef] }}
 * console.dir(copy); // -> { simple: 1, circle: { circ: [CyclicRef] }}
 *
 * // endless loop, throws a java.lang.StackOverflowError
 * let danger = objects.clone(root, false);
 *
 * // limiting the depth might lead to shallow clones!
 * let tree = { root: 1, a: { b: { c: { d: { e: "foo" } } } } };
 * let fullClone = objects.clone(tree);
 * let shallowClone = objects.clone(tree, true, 1);
 *
 * tree.root = 2; // depth = 1
 * tree.a.b.c.d.e = "bar"; // depth = 5
 *
 * console.log(tree.root); // --> 2
 * console.dir(tree.a.b.c.d); // --> { e: 'bar' }
 *
 * console.log(fullClone.root); // --> 1
 * console.dir(fullClone.a.b.c.d); // --> { e: 'foo' }
 *
 * console.log(shallowClone.root); // --> 1
 * console.dir(shallowClone.a.b.c.d); // --> { e: 'bar' }
 */
function clone(object, circular, depth, prototype) {
    if (typeof circular === 'object') {
        throw new Error("Old function signature used for objects.clone()!");
    }
    // maintain two arrays for circular references, where corresponding parents
    // and children have the same index
    var allParents = [];
    var allChildren = [];

    if (typeof circular == 'undefined') {
        circular = true;
    }

    if (typeof depth == 'undefined') {
        depth = Infinity;
    }

    // recurse this function so we don't reset allParents and allChildren
    function _clone(parent, depth) {
        // cloning null always returns null
        if (parent === null) {
            return null;
        }

        if (depth === 0) {
            return parent;
        }

        var child;
        var proto;
        if (typeof parent != 'object') {
            return parent;
        }

        if (Array.isArray(parent)) {
            child = [];
        } else if (parent instanceof RegExp) {
            var flags = "";
            if (parent.global) {
                flags += 'g';
            }
            if (parent.ignoreCase) {
                flags += 'i';
            }
            if (parent.multiline) {
                flags += 'm';
            }

            child = new RegExp(parent.source, flags);
            if (parent.lastIndex) child.lastIndex = parent.lastIndex;
        } else if (parent instanceof Date) {
            child = new Date(parent.getTime());
        } else {
            if (typeof prototype == 'undefined') {
                proto = Object.getPrototypeOf(parent);
                child = Object.create(proto);
            }
            else {
                child = Object.create(prototype);
                proto = prototype;
            }
        }

        if (circular) {
            var index = allParents.indexOf(parent);

            if (index != -1) {
                return allChildren[index];
            }
            allParents.push(parent);
            allChildren.push(child);
        }

        for (var i in parent) {
            var attrs;
            if (proto) {
                attrs = Object.getOwnPropertyDescriptor(proto, i);
            }

            if (attrs && attrs.set == null) {
                continue;
            }
            child[i] = _clone(parent[i], depth - 1);
        }

        return child;
    }

    return _clone(object, depth);
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

