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

var __shared__ = true;

/**
 * @fileoverview Adds useful methods to the JavaScript Array type.
 * <br /><br />
 * To use this optional module, its repository needs to be added to the 
 * application, for example by calling app.addRepository('modules/core/Array.js')
 * 
 * @addon
 */


/**
 * check if an array passed as argument contains
 * a specific value (start from end of array)
 * @param {Object} val the value to check
 * @return {boolean} true if the value is contained
 */
Array.prototype.__defineProperty__("contains", function(val) {
   return this.indexOf(val) > -1;
}, false, false, true);

/**
 * Retrieve the union set of a bunch of arrays
 * @param {Array} array1,... the arrays to unify
 * @return {Array} the union set
 */
Array.__defineProperty__("union", function() {
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
}, false, false, true);

/**
 * Retrieve the intersection set of a bunch of arrays
 * @param {Array} array1,... the arrays to intersect
 * @return {Array} the intersection set
 */
Array.__defineProperty__("intersection", function() {
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
}, false, false, true);
