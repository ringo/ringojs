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
 * Set the DONTENUM attribute on one or more properties on this object.
 * @param One or more property names or index numbers
 */
Object.prototype.dontEnum = function() {
    var rhino = new JavaImporter(org.mozilla.javascript);
    var DONTENUM = rhino.ScriptableObject.DONTENUM;
    var length = arguments.length;
    var cx = rhino.Context.currentContext;
    var wrapped = cx.wrapFactory.wrapAsJavaObject(cx, global, this, null);
    for (var i = 0; i < length; i++) {
        var prop = arguments[i];
        if (!this.hasOwnProperty(prop)) {
            continue;
        }
        try {
            wrapped.setAttributes(prop, DONTENUM);
        } catch (e) {
            var log = importModule('helma.logging').getLogger(__name__);
            log.error("Error in dontEnum for property " + prop, e.rhinoException);
        }
    }
    return;
}

/**
 * Set the READONLY attribute on one or more properties on this object.
 * @param One or more property names or index numbers
 */
Object.prototype.readOnly = function() {
    var rhino = new JavaImporter(org.mozilla.javascript);
    var READONLY = rhino.ScriptableObject.READONLY;
    var length = arguments.length;
    var cx = rhino.Context.currentContext;
    var wrapped = cx.wrapFactory.wrapAsJavaObject(cx, global, this, null);
    for (var i = 0; i < length; i++) {
        var prop = arguments[i];
        if (!this.hasOwnProperty(prop)) {
            continue;
        }
        try {
            wrapped.setAttributes(prop, READONLY);
        } catch (e) {
            var log = importModule('helma.logging').getLogger(__name__);
            log.error("Error in readOnly for property " + prop, e.rhinoException);
        }
    }
    return;
}


/**
 * copy the properties of an object into
 * a new object
 * @param Object the source object
 * @param Object the (optional) target object
 * @return Object the resulting object
 */
Object.prototype.clone = function(clone, recursive) {
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
};


/**
 * reduce an extended object (ie. a HopObject)
 * to a generic javascript object
 * @param HopObject the HopObject to be reduced
 * @return Object the resulting generic object
 */
Object.prototype.reduce = function(recursive) {
    var result = {};
    for (var i in this) {
        if (this[i] instanceof HopObject == false)
            result[i] = this[i];
        else if (recursive)
            result[i] = this.reduce(true);
    }
    return result;
};


/**
 * print the contents of an object for debugging
 * @param Object the object to dump
 * @param Boolean recursive flag (if true, dump child objects, too)
 */
Object.prototype.dump = function(recursive) {
    var beginList = "<ul>";
    var endList = "</ul>";
    var beginItem = "<li>";
    var endItem = "</li>";
    var beginKey = "<strong>";
    var endKey = ":</strong> ";
    res.write(beginList);
    for (var p in this) {
        res.write(beginItem);
        res.write(beginKey);
        res.write(p);
        res.write(endKey);
        if (recursive && typeof this[p] == "object") {
            var recurse = true;
            var types = [Function, Date, String, Number];
            for (var i in types) {
                if (this[p] instanceof types[i]) {
                    recurse = false
                    break;
                }
            }
            if (recurse == true)
                this[p].dump(true);
            else {
                res.write(this[p].toSource());
            }
        } else if (this[p]) {
            res.write(encode(this[p].toSource()));
        }
        res.write(endItem);
    }
    res.write(endList);
    return;
};


// prevent any newly added properties from being enumerated
for (var i in Object.prototype)
   Object.prototype.dontEnum(i);
