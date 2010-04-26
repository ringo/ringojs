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
 * $RCSfile: Array.js,v $
 * $Author: zumbrunn $
 * $Revision: 8714 $
 * $Date: 2007-12-13 13:21:48 +0100 (Don, 13 Dez 2007) $
 */

module.shared = true;

/**
 * @fileoverview Adds useful methods to the JavaScript Array type.
 * @addon
 */


/**
 * check if an array passed as argument contains
 * a specific value (start from end of array)
 * @param {Object} val the value to check
 * @returns {boolean} true if the value is contained
 */
Object.defineProperty(Array.prototype, "contains", {
    value: function(val) {
       return this.indexOf(val) > -1;
    }, writable: true
});

/**
 * Return the last element of this array. This is like pop(), but
 * without modifying the array.
 * @returns {Object} the last element of the array, or undefined if the array is empty.
 */
Object.defineProperty(Array.prototype, "peek", {
    value: function() {
       return this[this.length - 1];
    }, writable: true
});

/**
 * Remove the first occurrence of the argument value from this array. This method
 * mutates and returns the array on which it is called and does not create a
 * new array instance.
 * @param {Object} val the value to remove
 * @returns {Array} this array
 */
Object.defineProperty(Array.prototype, "remove", {
    value: function(val) {
        var index = this.indexOf(val);
        if(index > -1) {
            this.splice(index, 1);
        }
        return this;
    }, writable: true
});

/**
 * Retrieve the union set of a bunch of arrays
 * @param {Array} array1,... the arrays to unify
 * @returns {Array} the union set
 */
Object.defineProperty(Array, "union", {
    value: function() {
        var result = [];
        var map = new java.util.HashMap();
        for (var i=0; i<arguments.length; i+=1) {
            for (var n in arguments[i]) {
                var item = arguments[i][n];
                if (!map.containsKey(item)) {
                    result.push(item);
                    map.put(item, true);
                }
            }
        }
        return result;
    }, writable: true
});

/**
 * Retrieve the intersection set of a bunch of arrays
 * @param {Array} array1,... the arrays to intersect
 * @returns {Array} the intersection set
 */
Object.defineProperty(Array, "intersection", {
    value: function() {
        var all = Array.union.apply(this, arguments);
        var result = [];
        for (var n in all) {
            var chksum = 0;
            var item = all[n];
            for (var i=0; i<arguments.length; i+=1) {
                if (arguments[i].contains(item))
                    chksum += 1;
                else
                    break;
            }
            if (chksum == arguments.length)
                result.push(item);
        }
        return result;
    }, writable: true
});

/**
 * @returns the maximal element in this array obtained by calling Math.max().
 */
Object.defineProperty(Array.prototype, "max", {
    value: function() {
        return Math.max.apply( Math, this );
    }, writable: true
});

/**
 * @returns the minimal element in this array obtained by calling Math.min().
 */
Object.defineProperty(Array.prototype, "min", {
    value: function() {
        return Math.min.apply( Math, this );
    }, writable: true
});

Object.defineProperty(Array.prototype, "partition", {
    value: function(fn) {
        var trues = [], falses = [];
        for (var i=0; i<this.length; i++) {
            if (fn(this[i], i)) {
                trues.push(this[i]);
            } else {
                falses.push(this[i]);
            }
        }
        return [trues, falses]
    }, writable: true
});

