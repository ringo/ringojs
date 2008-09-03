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
 * $RCSfile: JSON.js,v $
 * $Author: zumbrunn $
 * $Revision: 8720 $
 * $Date: 2007-12-13 20:03:38 +0100 (Don, 13 Dez 2007) $
 */

/**
 * @fileoverview Adds JSON methods to the Object, Array and String prototypes.
 * <br /><br />
 * To use this optional module, its repository needs to be added to the 
 * application, for example by calling app.addRepository('modules/core/JSON.js')
 */

/*
    json.js
    2006-04-28 [http://www.json.org/json.js]

    This file adds these methods to JavaScript:

        object.toJSON()

            This method produces a JSON text from an object. The
            object must not contain any cyclical references.

        array.toJSON()

            This method produces a JSON text from an array. The
            array must not contain any cyclical references.

        string.parseJSON()

            This method parses a JSON text to produce an object or
            array. It will return false if there is an error.
*/

var __shared__ = true;

importModule('core.object');
importModule('helma.logging', 'logging');
var log = logging.getLogger(__name__);

(function () {
    var m = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    
    s = {
        /**
         * @ignore
         */
        array: function (x) {
            var a = ['['], b, f, i, l = x.length, v;
            for (i = 0; i < l; i += 1) {
                v = x[i];
                f = s[typeof v];
                if (f) {
                    v = f(v);
                    if (typeof v == 'string') {
                        if (b) {
                            a[a.length] = ',';
                        }
                        a[a.length] = v;
                        b = true;
                    }
                }
            }
            a[a.length] = ']';
            return a.join('');
        },

        'boolean': function (x) {
            return String(x);
        },
        
        'null': function (x) {
            return "null";
        },
        
        /**
         * @ignore
         */
        number: function (x) {
            return isFinite(x) ? String(x) : 'null';
        },
        
        /**
         * @ignore
         */
        object: function (x) {
            if (x) {
                if (x instanceof Array) {
                    return s.array(x);
                }
                var a = ['{'], b, f, i, v;
                for (i in x) {
                    v = x[i];
                    f = s[typeof v];
                    log.debug("Encoding property " + i + " of type " + typeof v);
                    if (f) {
                        v = f(v);
                        if (typeof v == 'string') {
                            if (b) {
                                a[a.length] = ',';
                            }
                            a.push(s.string(i), ':', v);
                            b = true;
                        }
                    }
                }
                a[a.length] = '}';
                return a.join('');
            }
            return 'null';
        },
        
        /**
         * @ignore
         */
        string: function (x) {
            if (/["\\\x00-\x1f]/.test(x)) {
                x = x.replace(/([\x00-\x1f\\"])/g, function(a, b) {
                    var c = m[b];
                    if (c) {
                        return c;
                    }
                    c = b.charCodeAt();
                    return '\\u00' +
                        Math.floor(c / 16).toString(16) +
                        (c % 16).toString(16);
                });
            }
            return '"' + x + '"';
        }
    };

    /**
     * This method produces a JSON text from an object. 
     * The object must not contain any cyclical references.
     */
    Object.prototype.toJSON = function () {
        return s.object(this);
    };

    /**
     * This method produces a JSON text from an array. 
     * The array must not contain any cyclical references.
     */
    Array.prototype.toJSON = function () {
        return s.array(this);
    };

    Object.prototype.dontEnum("toJSON");
    Array.prototype.dontEnum("toJSON");
    return;
})();


/**
 * This method parses a JSON text to produce an object or
 * array. It will return false if there is an error.
 */
String.prototype.parseJSON = function () {
    try {
        return !(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(this.replace(/"(\\.|[^"\\])*"/g, ''))) && eval('(' + this + ')');
    } catch (e) {
        return false;
    }
};

String.prototype.dontEnum("parseJSON");
