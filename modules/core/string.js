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
 * $RCSfile: String.js,v $
 * $Author: zumbrunn $
 * $Revision: 8714 $
 * $Date: 2007-12-13 13:21:48 +0100 (Don, 13 Dez 2007) $
 */

var asJavaString = require('helma/engine').asJavaString;

module.shared = true;

var ANUMPATTERN = /[^a-zA-Z0-9]/;
var APATTERN = /[^a-zA-Z]/;
var NUMPATTERN = /[^0-9]/;
var FILEPATTERN = /[^a-zA-Z0-9-_\. ]/;
var HEXPATTERN = /[^a-fA-F0-9]/;
var EMAILPATTERN = /^.+@.+\.[a-zA-Z]+$/;
var URLPATTERN = /^([^:]*):\/\/+(?:([^\/]*):)?(?:([^\/]*)@)?([\w\-_.]*[^.])(\/[^?]*)?(?:\?(.*))?$/;
var ISOFORMAT = "yyyy-MM-dd'T'HH:mm:ssZ";

/**
 * @fileoverview Adds useful methods to the JavaScript String type.
 */

/**
 * checks if a date format pattern is correct
 * @return Boolean true if the pattern is correct
 */
Object.defineProperty(String.prototype, "isDateFormat", {
    value: function() {
        try {
            new java.text.SimpleDateFormat(this);
            return true;
        } catch (err) {
            return false;
        }
    }
});


/**
 * parse a timestamp into a date object. This is used when users
 * want to set createtime explicitly when creating/editing stories.
 * @param String date format to be applied
 * @param Object Java TimeZone Object (optional)
 * @return Object contains the resulting date
 */
Object.defineProperty(String.prototype, "toDate", {
    value: function(format, timezone) {
        var sdf = res.data._dateformat;
        if (!sdf) {
            sdf = new java.text.SimpleDateFormat(format);
            res.data._dateformat = sdf;
        } else if (format != sdf.toPattern())
            sdf.applyPattern(format);
        if (timezone && timezone != sdf.getTimeZone())
            sdf.setTimeZone(timezone);
        try {
            return new Date(sdf.parse(this).getTime());
        } catch (err) {
            return null;
        }
    }
});



/**
 * function checks if the string passed contains any characters that
 * are forbidden in URLs and tries to create a java.net.URL from it
 * FIXME: probably deprecated -> helma.Url
 * @return Boolean
 */
Object.defineProperty(String.prototype, "isUrl", {
    value: function() {
        if (URLPATTERN.test(this)) {
            return true;
        }
        try {
            new java.net.URL(this);
        } catch (err) {
            return false;
        }
        return true;
    }
});


/**
 * function checks if the string passed contains any characters
 * that are forbidden in image- or filenames
 * @return Boolean
 */
Object.defineProperty(String.prototype, "isFileName", {
    value: function() {
        return !FILEPATTERN.test(this);
    }
});


/**
 * function cleans the string passed as argument from any characters
 * that are forbidden or shouldn't be used in filenames
 * @return Boolean
 */
Object.defineProperty(String.prototype, "toFileName", {
    value: function() {
        return this.replace(new RegExp(FILEPATTERN.source, "g"), '');
    }
});


/**
 * function checks a string for a valid color value in hexadecimal format.
 * it may also contain # as first character
 *  @returns Boolean false, if string length (without #) > 6 or < 6 or
 *              contains any character which is not a valid hex value
 */
Object.defineProperty(String.prototype, "isHexColor", {
    value: function() {
        var str = this;
        if (this.indexOf("#") == 0)
            str = this.substring(1);
        if (str.length != 6)
            return false;
        return !HEXPATTERN.test(str);
    }
});


/**
 * converts a string into a hexadecimal color
 * representation (e.g. "ffcc33"). also knows how to
 * convert a color string like "rgb (255, 204, 51)".
 * @return String the resulting hex color (w/o "#")
 */
Object.defineProperty(String.prototype, "toHexColor", {
    value: function() {
        if (this.startsWith("rgb")) {
            var buffer = [];
            var col = this.replace(/[^0-9,]/g, '');
            var parts = col.split(",");
            for (var i in parts) {
                var num = parseInt(parts[i], 10);
                var hex = num.toString(16);
                buffer.push(hex.pad("0", 2, -1));
            }
            return buffer.join("");
        }
        var color = this.replace(new RegExp(HEXPATTERN.source), '');
        return color.toLowerCase().pad("0", 6, -1);
    }
});


/**
 * function returns true if the string contains
 * only a-z and 0-9 (case insensitive!)
 * @return Boolean true in case string is alpha, false otherwise
 */
Object.defineProperty(String.prototype, "isAlphanumeric", {
    value: function() {
        if (!this.length)
            return false;
        return !ANUMPATTERN.test(this);
    }
});


/**
 * function cleans a string by throwing away all
 * non-alphanumeric characters
 * @return cleaned string
 */
Object.defineProperty(String.prototype, "toAlphanumeric", {
    value: function() {
        return this.replace(new RegExp(ANUMPATTERN.source, "g"), '');
    }
});


/**
 * function returns true if the string contains
 * only characters a-z
 * @return Boolean true in case string is alpha, false otherwise
 */
Object.defineProperty(String.prototype, "isAlpha", {
    value: function() {
        if (!this.length)
            return false;
        return !APATTERN.test(this);
    }
});


/**
 * function returns true if the string contains
 * only 0-9
 * @return Boolean true in case string is numeric, false otherwise
 */
Object.defineProperty(String.prototype, "isNumeric", {
    value: function() {
        if (!this.length)
            return false;
        return !NUMPATTERN.test(this);
    }
});


/**
 * transforms the first n characters of a string to uppercase
 * @param Number amount of characters to transform
 * @return String the resulting string
 */
Object.defineProperty(String.prototype, "capitalize", {
    value: function(limit) {
        if (limit == null)
            limit = 1;
        var head = this.substring(0, limit);
        var tail = this.substring(limit, this.length);
        return head.toUpperCase() + tail.toLowerCase();
    }
});


/**
 * transforms the first n characters of each
 * word in a string to uppercase
 * @return String the resulting string
 */
Object.defineProperty(String.prototype, "titleize", {
    value: function() {
        var parts = this.split(" ");
        var buffer = [];
        for (var i in parts) {
            buffer.push(parts[i].capitalize());
        }
        return buffer.join(" ");
    }
});


/**
 * translates all characters of a string into HTML entities
 * @return String translated result
 */
Object.defineProperty(String.prototype, "entitize", {
    value: function() {
        var buffer = [];
        for (var i=0; i<this.length; i++) {
            buffer.push("&#", this.charCodeAt(i).toString(), ";");
        }
        return buffer.join("");
    }
});


/**
 * breaks up a string into two parts called
 * head and tail at the given position
 * don't apply this to HTML, i.e. use stripTags() in advance
 * @param Number number of charactrers or of segments separated by the delimiter
 * @param String pre-/suffix to be pre-/appended to shortened string
 * @param String delimiter
 * @return Object containing head and tail properties
 */
Object.defineProperty(String.prototype, "embody", {
    value: function(limit, clipping, delimiter) {
        if (typeof limit == "string")
            limit = parseInt(limit, 10);
        var result = {head: this, tail: ''};
        if (!limit || limit < 1)
            return result;
        if (!delimiter || delimiter == '')
            result.head= this.substring(0, limit);
        else {
            var re = new RegExp ("(" + delimiter + "+)");
            result.head = this.split(re, 2*limit - 1).join('');
        }
        if (result.head != this) {
            result.tail = this.substring(result.head.length).trim();
            if (result.tail) {
                if (clipping == null)
                    clipping = "...";
                result.head = result.head.trim() + clipping;
                result.tail = clipping + result.tail;
            }
        }
        return result;
    }
});


/**
 * get the head of a string
 * @see String.prototype.embody()
 */
Object.defineProperty(String.prototype, "head", {
    value: function(limit, clipping, delimiter) {
        return this.embody(limit, clipping, delimiter).head;
    }
});


/**
 * get the tail of a string
 * @see String.prototype.embody()
 */
Object.defineProperty(String.prototype, "tail", {
    value: function(limit, clipping, delimiter) {
        return this.embody(limit, clipping, delimiter).tail;
    }
});


/*
 * set clip method out of compatibility/convenience reason
 * FIXME: we eventually have to get rid of this one...
 * @see String.prototype.head()
 */
Object.defineProperty(String.prototype, "clip", {
    value: String.prototype.head
});


/**
 * function inserts a string every number of characters
 * @param Int number of characters after which insertion should take place
 * @param String string to be inserted
 * @param Boolean definitely insert at each interval position
 * @return String resulting string
 */
Object.defineProperty(String.prototype, "group", {
    value: function(interval, str, ignoreWhiteSpace) {
        if (!interval || interval < 1)
            interval = 20;
        if (!str || this.length < interval)
            return this;
        var buffer = [];
        for (var i=0; i<this.length; i=i+interval) {
            var strPart = this.substring(i, i+interval);
            buffer.push(strPart);
            if (ignoreWhiteSpace == true ||
                (strPart.length == interval && !/\s/g.test(strPart))) {
                buffer.push(str);
            }
        }
        return buffer.join("");
    }
});


/**
 * replace all linebreaks and optionally all w/br tags
 * @param Boolean flag indicating if html tags should be replaced
 * @param String replacement for the linebreaks / html tags
 * @return String the unwrapped string
 */
Object.defineProperty(String.prototype, "unwrap", {
    value: function(removeTags, replacement) {
        if (replacement == null)
            replacement = '';
        var str = this.replace(/[\n|\r]/g, replacement);
        if (removeTags)
            str = str.replace(/<[w]?br *\/?>/g, replacement);
        return str;
    }
});


/**
 * function calculates a message digest of a string. If no
 * argument is passed, the MD5 algorithm is used.
 * @param algorithm the name of the algorithm to use
 * @return String message digest of the string
 */
Object.defineProperty(String.prototype, "digest", {
    value: function(algorithm) {
        var str = asJavaString(this);
        var md = java.security.MessageDigest.getInstance(algorithm || 'MD5');
        var b = md.digest(str.getBytes())
        var buf = new java.lang.StringBuffer(b.length * 2);
        var j;

        for (var i in b) {
            j = (b[i] < 0) ? (256 + b[i]) : b[i];

            if (j < 16) {
                buf.append('0');
            }

            buf.append(java.lang.Integer.toHexString(j));
        }

        return buf.toString();
    }
});


/**
 * function repeats a string passed as argument
 * @param Int amount of repetitions
 * @return String resulting string
 */
Object.defineProperty(String.prototype, "repeat", {
    value: function(multiplier) {
        var list = [];
        for (var i=0; i<multiplier; i++)
            list[i] = this;
        return list.join('');
    }
});


/**
 * function returns true if the string starts with
 * the string passed as argument
 * @param String string pattern to search for
 * @return Boolean true in case it matches the beginning
 *            of the string, false otherwise
 */
Object.defineProperty(String.prototype, "startsWith", {
    value: function(str, offset) {
        offset = offset || 0;
        return this.indexOf(str) == offset;
    }
});


/**
 * function returns true if the string ends with
 * the string passed as argument
 * @param String string pattern to search for
 * @return Boolean true in case it matches the end of
 *            the string, false otherwise
 */
Object.defineProperty(String.prototype, "endsWith", {
    value: function(str) {
        var diff = this.length - str.length;
        return diff > -1 && this.lastIndexOf(str) == diff;
    }
});


/**
 * fills a string with another string up to a desired length
 * @param String the filling string
 * @param Number the desired length of the resulting string
 * @param Number the direction which the string will be padded in:
 * a negative number means left, 0 means both, a positive number means right
 * @return String the resulting string
 */
Object.defineProperty(String.prototype, "pad", {
    value: function(str, len, mode) {
        if (str == null || len == null) {
            return this;
        }
        var diff = len - this.length;
        if (diff == 0) {
            return this;
        }
        var left, right = 0;
        if (mode == null || mode > 0) {
            right = diff;
        } else if (mode < 0) {
            left = diff;
        } else if (mode == 0) {
            right = Math.round(diff / 2);
            left = diff - right;
        }
        var list = [];
        for (var i = 0; i < left; i++) {
            list[i] = str;
        }
        list.push(this);
        for (i = 0; i < right; i++) {
            list.push(str);
        }
        return list.join('');
    }
});


/**
 * function returns true if a string contains the string
 * passed as argument
 * @param String string to search for
 * @param Int Position to start search
 * @param Boolean
 */
Object.defineProperty(String.prototype, "contains", {
    value: function(str, fromIndex) {
        return this.indexOf(str, fromIndex ? fromIndex : 0) > -1;
    }
});


/**
 * Get the longest common segment that this and the other string
 * have in common, starting at the beginning of the string
 * @param str a string
 * @return the longest common segment
 */
Object.defineProperty(String.prototype, "getCommonPrefix", {
    value: function(str) {
        if (str == null) {
            return null;
        } else if (str.length <= this.length && this.indexOf(str) == 0) {
            return str;
        } else if (this.length <= str.length && str.indexOf(this) == 0) {
            return this;
        }
        var length = Math.min(this.length, str.length);
        for (var i = 0; i < length; i++) {
            if (this[i] != str[i]) {
                return this.slice(0, i);
            }
        }
        return this.slice(0, length);
    }
});


/**
 * function compares a string with the one passed as argument
 * using diff
 * @param String String to compare against String object value
 * @param String Optional regular expression string to use for
 *                 splitting. If not defined, newlines will be used.
 * @return Object Array containing one JS object for each line
 *                     with the following properties:
 *                     .num Line number
 *                     .value String line if unchanged
 *                     .deleted Obj Array containing deleted lines
 *                     .inserted Obj Array containing added lines
 */
Object.defineProperty(String.prototype, "diff", {
    value: function(mod, separator) {
        // if no separator use line separator
        var regexp = (typeof(separator) == "undefined") ?
                     new RegExp("\r\n|\r|\n") :
                     new RegExp(separator);
        // split both strings into arrays
        var orig = this.split(regexp);
        var mod = mod.split(regexp);
        // create the Diff object
        var diff = new Packages.helma.util.Diff(orig, mod);
        // get the diff.
        var d = diff.diff();
        if (!d)
            return null;

        var max = Math.max(orig.length, mod.length);
        var result = new Array();
        for (var i = 0; i < max; i++) {
            var line = result[i];
            if (!line) {
                line = new Object();
                line.num = (i+1);
                result[i] = line;
            }
            if (d && i == d.line1) {
                if (d.deleted) {
                    var del = new Array();
                    for (var j = d.line0; j < d.line0 + d.deleted; j++)
                        del[del.length] = orig[j];
                    line.deleted = del;
                }
                if (d.inserted) {
                    var ins = new Array();
                    for (var j = d.line1; j < d.line1 + d.inserted; j++)
                        ins[ins.length] = mod[j];
                    line.inserted = ins;
                }
                i = d.line1 + d.inserted -1;
                d = d.link;
            } else {
                line.value = mod[i];
            }
        }
        return result;
    }
});


/**
 * returns true if the string looks like an e-mail
 */
Object.defineProperty(String.prototype, "isEmail", {
    value: function() {
        return EMAILPATTERN.test(this);
    }
});


/**
 * returns the amount of occurences of one string in another
 */
Object.defineProperty(String.prototype, "count", {
    value: function(str) {
        var count = 0;
        var offset = 0;
        while ((offset = this.indexOf(str, offset)) > -1) {
            count += 1;
            offset += 1;
        }
        return count;
    }
});


/**
 * returns the string encoded using the base64 algorithm
 */
Object.defineProperty(String.prototype, "enbase64", {
    value: function() {
        var bytes = asJavaString(this).getBytes();
        return new Packages.sun.misc.BASE64Encoder().encode(bytes);
    }
});


/**
 * returns the decoded string using the base64 algorithm
 */
Object.defineProperty(String.prototype, "debase64", {
    value: function() {
        var bytes = new Packages.sun.misc.BASE64Decoder().decodeBuffer(this);
        return String(new java.lang.String(bytes));
    }
});


/**
 * Remove all potential HTML/XML tags from this string.
 */
Object.defineProperty(String.prototype, "stripTags", {
    value: function() {
        return this.replace(/<\/?[^>]+>/gi, '');
    }
});

/**
 * Escape the string to make it safe for use within an HTML document.
 */
Object.defineProperty(String.prototype, "escapeHtml", {
    value: function() {
        return this.replace(/&/g, '&amp;')
                   .replace(/"/g, '&quot;')
                   .replace(/>/g, '&gt;')
                   .replace(/</g, '&lt;');
    }
});

/**
 * factory to create functions for sorting objects in an array
 * @param String name of the field each object is compared with
 * @param Number order (ascending or descending)
 * @return Function ready for use in Array.prototype.sort
 */
Object.defineProperty(String, "Sorter", {
    value: function(field, order) {
        if (!order)
            order = 1;
        return function(a, b) {
            var str1 = String(a[field] || '').toLowerCase();
            var str2 = String(b[field] || '').toLowerCase();
            if (str1 > str2)
                return order;
            if (str1 < str2)
                return order * -1;
            return 0;
        };
    }
});

String.Sorter.ASC = 1;
String.Sorter.DESC = -1;


/**
 * create a string from a bunch of substrings
 * @param String one or more strings as arguments
 * @return String the resulting string
 */
Object.defineProperty(String, "compose", {
    value: function() {
        return Array.join(arguments, '');
    }
});


/**
 * creates a random string (numbers and chars)
 * @param len length of key
 * @param mode determines which letters to use. null or 0 = all letters;
 *      1 = skip 0, 1, l and o which can easily be mixed with numbers;
 *      2 = use numbers only
 * @returns random string
 */
Object.defineProperty(String, "random", {
    value: function(len, mode) {
        if (mode == 2) {
            var x = Math.random() * Math.pow(10,len);
            return Math.floor(x);
        }
        var keystr = '';
        for (var i=0; i<len; i++) {
            var x = Math.floor((Math.random() * 36));
            if (mode == 1) {
                // skip 0,1
                x = (x<2) ? x + 2 : x;
                // don't use the letters l (charCode 21+87) and o (24+87)
                x = (x==21) ? 22 : x;
                x = (x==24) ? 25 : x;
            }
            if (x<10) {
                keystr += String(x);
            }    else    {
                keystr += String.fromCharCode(x+87);
            }
        }
        return keystr;
    }
});


/**
 * append one string onto another and add some "glue"
 * if none of the strings is empty or null.
 * @param String the first string
 * @param String the string to be appended onto the first one
 * @param String the "glue" to be inserted between both strings
 * @return String the resulting string
 */
Object.defineProperty(String, "join", {
    value: function(str1, str2, glue) {
        if (glue == null)
            glue = '';
        if (str1 && str2)
            return str1 + glue + str2;
        else if (str2)
            return str2;
        return str1;
    }
});
