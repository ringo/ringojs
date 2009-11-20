/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 *
 * Copyright 1998-2006 Helma Software. All Rights Reserved.
 *
 * $RCSfile: Object.js,v $
 * $Author: zumbrunn $
 * $Revision: 8714 $
 * $Date: 2007-12-13 13:21:48 +0100 (Don, 13 Dez 2007) $
 */

/**
 * @fileoverview Adds useful methods to the JavaScript Object type.
 */

module.shared = true;

/**
 * copy the properties of an object into
 * a new object
 * @param {Object} clone the clone object
 * @param {boolean} recursive pass true to create a deep clone. Otherwise a shallow clone is created.
 * @returns {Object} the clone object
 */
Object.defineProperty(Object.prototype, "clone", {
    value: function(clone, recursive) {
        if (!clone)
            clone = new this.constructor();
        var value;
        for (var propName in this) {
            value = this[propName];
            if (recursive && (value.constructor == Object || value.constructor == Array)) {
                clone[propName] = value.clone(new value.constructor(), recursive);
            } else {
                clone[propName] = value;
            }
        }
        return clone;
    }, writable: true
});


/**
 * Creates a new object as the as the keywise union of the provided objects.
 * Whenever a key exists in a later object that already existed in an earlier
 * object, the according value of the earlier object takes precedence.
 * @param {Object} obj... The objects to merge
 */
Object.defineProperty(Object, "merge", {
    value: function() {
        var result = {};
        for (var i = arguments.length; i > 0; --i) {
            var obj = arguments[i - 1];
            for (var property in obj) {
                result[property] = obj[property];
            }
        }
        return result;
    }, writable: true
});


