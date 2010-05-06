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

module.shared = true;

var ANUMPATTERN = /[^a-zA-Z0-9]/;
var APATTERN = /[^a-zA-Z]/;
var NUMPATTERN = /[^0-9]/;
var FILEPATTERN = /[^a-zA-Z0-9-_\. ]/;
var HEXPATTERN = /[^a-fA-F0-9]/;
// Email and URL RegExps contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
// licensed unter MIT license - http://www.opensource.org/licenses/mit-license.php
var EMAILPATTERN = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;
var URLPATTERN = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
var ISOFORMAT = "yyyy-MM-dd'T'HH:mm:ssZ";

/**
 * @fileoverview Adds useful methods to the JavaScript String type.
 */

/**
 * checks if a date format pattern is correct
 * @returns Boolean true if the pattern is correct
 */
Object.defineProperty(String.prototype, "isDateFormat", {
    value: function() {
        try {
            new java.text.SimpleDateFormat(this);
            return true;
        } catch (err) {
            return false;
        }
    }, writable: true
});


/**
 * parse a timestamp into a date object. This is used when users
 * want to set createtime explicitly when creating/editing stories.
 * @param String date format to be applied
 * @param Object Java TimeZone Object (optional)
 * @returns Object contains the resulting date
 */
Object.defineProperty(String.prototype, "toDate", {
    value: function(format, timezone) {
        var simpleDateFormat = new java.text.SimpleDateFormat(format);
        if (timezone && timezone != simpleDateFormat.getTimeZone()) {
            simpleDateFormat.setTimeZone(timezone);
        }
        return new Date(simpleDateFormat.parse(this).getTime());
    }, writable: true
});



/**
 * function checks if the string passed contains any characters that
 * are forbidden in URLs and tries to create a java.net.URL from it
 * FIXME: probably deprecated -> ringo.Url
 * @returns Boolean
 */
Object.defineProperty(String.prototype, "isUrl", {
    value: function() {
        return URLPATTERN.test(this);
    }, writable: true
});


/**
 * function checks if the string passed contains any characters
 * that are forbidden in image- or filenames
 * @returns Boolean
 */
Object.defineProperty(String.prototype, "isFileName", {
    value: function() {
        return !FILEPATTERN.test(this);
    }, writable: true
});


/**
 * function cleans the string passed as argument from any characters
 * that are forbidden or shouldn't be used in filenames
 * @returns Boolean
 */
Object.defineProperty(String.prototype, "toFileName", {
    value: function() {
        return this.replace(new RegExp(FILEPATTERN.source, "g"), '');
    }, writable: true
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
    }, writable: true
});


/**
 * converts a string into a hexadecimal color
 * representation (e.g. "ffcc33"). also knows how to
 * convert a color string like "rgb (255, 204, 51)".
 * @returns String the resulting hex color (w/o "#")
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
    }, writable: true
});


/**
 * function returns true if the string contains
 * only a-z and 0-9 (case insensitive!)
 * @returns Boolean true in case string is alpha, false otherwise
 */
Object.defineProperty(String.prototype, "isAlphanumeric", {
    value: function() {
        if (!this.length)
            return false;
        return !ANUMPATTERN.test(this);
    }, writable: true
});


/**
 * function cleans a string by throwing away all
 * non-alphanumeric characters
 * @returns cleaned string
 */
Object.defineProperty(String.prototype, "toAlphanumeric", {
    value: function() {
        return this.replace(new RegExp(ANUMPATTERN.source, "g"), '');
    }, writable: true
});


/**
 * function returns true if the string contains
 * only characters a-z
 * @returns Boolean true in case string is alpha, false otherwise
 */
Object.defineProperty(String.prototype, "isAlpha", {
    value: function() {
        if (!this.length)
            return false;
        return !APATTERN.test(this);
    }, writable: true
});


/**
 * function returns true if the string contains
 * only 0-9
 * @returns Boolean true in case string is numeric, false otherwise
 */
Object.defineProperty(String.prototype, "isNumeric", {
    value: function() {
        if (!this.length)
            return false;
        return !NUMPATTERN.test(this);
    }, writable: true
});


/**
 * Transforms this string to camel-case.
 * @returns String the resulting string
 * @since 0.5
 */
Object.defineProperty(String.prototype, "toCamelCase", {
    value: function() {
        return this.replace(/([A-Z]+)/g, function(m, l) {
            // "ABC" -> "Abc"
            return l[0].toUpperCase() + l.substring(1).toLowerCase();
        }).replace(/[\-_\s](.)/g, function(m, l) {
            // foo-bar -> fooBar
            return l.toUpperCase();
        });
    }, writable: true
});


/**
 * transforms the first n characters of a string to uppercase
 * @param Number amount of characters to transform
 * @returns String the resulting string
 */
Object.defineProperty(String.prototype, "capitalize", {
    value: function(limit) {
        if (limit == null)
            limit = 1;
        var head = this.substring(0, limit);
        var tail = this.substring(limit, this.length);
        return head.toUpperCase() + tail.toLowerCase();
    }, writable: true
});


/**
 * transforms the first n characters of each
 * word in a string to uppercase
 * @returns String the resulting string
 */
Object.defineProperty(String.prototype, "titleize", {
    value: function() {
        var parts = this.split(" ");
        var buffer = [];
        for (var i in parts) {
            buffer.push(parts[i].capitalize());
        }
        return buffer.join(" ");
    }, writable: true
});


/**
 * translates all characters of a string into HTML entities
 * @returns String translated result
 */
Object.defineProperty(String.prototype, "entitize", {
    value: function() {
        var buffer = [];
        for (var i=0; i<this.length; i++) {
            buffer.push("&#", this.charCodeAt(i).toString(), ";");
        }
        return buffer.join("");
    }, writable: true
});


/**
 * function inserts a string every number of characters
 * @param Int number of characters after which insertion should take place
 * @param String string to be inserted
 * @param Boolean definitely insert at each interval position
 * @returns String resulting string
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
    }, writable: true
});


/**
 * replace all linebreaks and optionally all w/br tags
 * @param Boolean flag indicating if html tags should be replaced
 * @param String replacement for the linebreaks / html tags
 * @returns String the unwrapped string
 */
Object.defineProperty(String.prototype, "unwrap", {
    value: function(removeTags, replacement) {
        if (replacement == null)
            replacement = '';
        var str = this.replace(/[\n|\r]/g, replacement);
        if (removeTags)
            str = str.replace(/<[w]?br *\/?>/g, replacement);
        return str;
    }, writable: true
});


/**
 * function calculates a message digest of a string. If no
 * argument is passed, the MD5 algorithm is used.
 * @param algorithm the name of the algorithm to use
 * @returns String message digest of the string
 */
Object.defineProperty(String.prototype, "digest", {
    value: function(algorithm) {
        var {ByteString} = require('binary');
        var md = java.security.MessageDigest.getInstance(algorithm || 'MD5');
        var b = ByteString.wrap(md.digest(this.toByteString()));
        var buf = [];

        for (var i = 0; i < b.length; i++) {
            var j = b[i];
            if (j < 16) {
                buf[buf.length] = '0';
            }
            buf[buf.length] = j.toString(16);
        }
        return buf.join('');
    }, writable: true
});


/**
 * function repeats a string passed as argument
 * @param Int amount of repetitions
 * @returns String resulting string
 */
Object.defineProperty(String.prototype, "repeat", {
    value: function(multiplier) {
        var list = [];
        for (var i=0; i<multiplier; i++)
            list[i] = this;
        return list.join('');
    }, writable: true
});


/**
 * function returns true if the string starts with
 * the string passed as argument
 * @param String string pattern to search for
 * @returns Boolean true in case it matches the beginning
 *            of the string, false otherwise
 */
Object.defineProperty(String.prototype, "startsWith", {
    value: function(str, offset) {
        offset = offset || 0;
        return this.indexOf(str) == offset;
    }, writable: true
});


/**
 * function returns true if the string ends with
 * the string passed as argument
 * @param String string pattern to search for
 * @returns Boolean true in case it matches the end of
 *            the string, false otherwise
 */
Object.defineProperty(String.prototype, "endsWith", {
    value: function(str) {
        var diff = this.length - str.length;
        return diff > -1 && this.lastIndexOf(str) == diff;
    }, writable: true
});


/**
 * fills a string with another string up to a desired length
 * @param String the filling string
 * @param Number the desired length of the resulting string
 * @param Number the direction which the string will be padded in:
 * a negative number means left, 0 means both, a positive number means right
 * @returns String the resulting string
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
    }, writable: true
});


/**
 * function returns true if a string contains the string
 * passed as argument
 * @param String string to search for
 * @param Int Position to start search
 * @returns true if str is contained in this string
 * @type Boolean
 */
Object.defineProperty(String.prototype, "contains", {
    value: function(str, fromIndex) {
        return this.indexOf(str, fromIndex ? fromIndex : 0) > -1;
    }, writable: true
});


/**
 * Get the longest common segment that this and the other string
 * have in common, starting at the beginning of the string
 * @param str a string
 * @returns the longest common segment
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
    }, writable: true
});


/**
 * returns true if the string looks like an e-mail
 */
Object.defineProperty(String.prototype, "isEmail", {
    value: function() {
        return EMAILPATTERN.test(this);
    }, writable: true
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
    }, writable: true
});


/**
 * returns the string encoded using the base64 algorithm
 */
Object.defineProperty(String.prototype, "enbase64", {
    value: function() {
        return require('ringo/base64').encode(this);
    }, writable: true
});


/**
 * returns the decoded string using the base64 algorithm
 */
Object.defineProperty(String.prototype, "debase64", {
    value: function() {
        return require('ringo/base64').decode(this);
    }, writable: true
});


/**
 * Remove all potential HTML/XML tags from this string.
 */
Object.defineProperty(String.prototype, "stripTags", {
    value: function() {
        return this.replace(/<\/?[^>]+>/gi, '');
    }, writable: true
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
    }, writable: true
});

/**
 * factory to create functions for sorting objects in an array
 * @param String name of the field each object is compared with
 * @param Number order (ascending or descending)
 * @returns Function ready for use in Array.prototype.sort
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
    }, writable: true
});

String.Sorter.ASC = 1;
String.Sorter.DESC = -1;


/**
 * create a string from a bunch of substrings
 * @param String one or more strings as arguments
 * @returns String the resulting string
 */
Object.defineProperty(String, "compose", {
    value: function() {
        return Array.join(arguments, '');
    }, writable: true
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
    }, writable: true
});


/**
 * append one string onto another and add some "glue"
 * if none of the strings is empty or null.
 * @param String the first string
 * @param String the string to be appended onto the first one
 * @param String the "glue" to be inserted between both strings
 * @returns String the resulting string
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
    }, writable: true
});
