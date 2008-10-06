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

__shared__ = true;

/**
 * @fileoverview Adds useful methods to the JavaScript Object type.
 * <br /><br />
 * To use this optional module, its repository needs to be added to the 
 * application, for example by calling app.addRepository('modules/core/Object.js')
 */


/**
 * copy the properties of an object into
 * a new object
 * @param Object the source object
 * @param Object the (optional) target object
 * @return Object the resulting object
 */
Object.prototype.__defineProperty__("clone", function(clone, recursive) {
   if (!clone)
      clone = new this.constructor();
   var value;
   for (var propName in this) {
      value = this[propName];
      if (recursive && (value.constructor == HopObject || value.constructor == Object)) {
         clone[propName] = value.clone(new value.constructor(), recursive);
      } else {
         clone[propName] = value;
      }
   }
   return clone;
}, false, false, true);


/**
 * Creates a new object as the as the keywise union of the provided objects.
 * Whenever a key exists in a later object that already existed in an earlier
 * object, the according value of the earlier object takes precedence.
 */
Object.prototype.__defineProperty__("merge", function() {
    var result = {};
    for (var i = arguments.length; i > 0; --i) {
        var obj = arguments[i - 1];
        for (var property in obj) {
            result[property] = obj[property];
        }
    }
    return result;
}, false, false, true);


