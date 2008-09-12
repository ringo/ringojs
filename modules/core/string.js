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

__shared__ = true;

String.ANUMPATTERN    = /[^a-zA-Z0-9]/;
String.APATTERN       = /[^a-zA-Z]/;
String.NUMPATTERN     = /[^0-9]/;
String.FILEPATTERN    = /[^a-zA-Z0-9-_\. ]/;
String.HEXPATTERN     = /[^a-fA-F0-9]/;
String.EMAILPATTERN   = /^.+@.+\.[a-zA-Z]+$/;
String.URLPATTERN     = /^([^:]*):\/\/+(?:([^\/]*):)?(?:([^\/]*)@)?([\w\-_.]*[^.])(\/[^?]*)?(?:\?(.*))?$/;
String.LEFT           = -1
String.BALANCE        = 0
String.RIGHT          = 1
String.ISOFORMAT      = "yyyy-MM-dd'T'HH:mm:ssZ";
String.SPACE          = " ";
String.EMPTY          = "";
String.NULL           = String.EMPTY; // to be deprecated?

/**
 * @fileoverview Adds useful methods to the JavaScript String type.
 * <br /><br />
 * To use this optional module, its repository needs to be added to the 
 * application, for example by calling app.addRepository('modules/core/String.js')
 */

loadModule('core.object');

/**
 * checks if a date format pattern is correct
 * @return Boolean true if the pattern is correct
 */
String.prototype.isDateFormat = function() {
    try {
        new java.text.SimpleDateFormat(this);
        return true;
    } catch (err) {
        return false;
    }
};


/**
 * parse a timestamp into a date object. This is used when users
 * want to set createtime explicitly when creating/editing stories.
 * @param String date format to be applied
 * @param Object Java TimeZone Object (optional)
 * @return Object contains the resulting date
 */
String.prototype.toDate = function(format, timezone) {
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
};


/**
 * function checks if the string passed contains any characters that
 * are forbidden in URLs and tries to create a java.net.URL from it
 * FIXME: probably deprecated -> helma.Url
 * @return Boolean
 * @see helma.Url.PATTERN
 */
String.prototype.isUrl = function() {
    if (String.URLPATTERN.test(this))
        return true;
    try {
        return new java.net.URL(this);
    } catch (err) {
        return false;
    }
    return true;
};


/**
 * function checks if the string passed contains any characters
 * that are forbidden in image- or filenames
 * @return Boolean
 */
String.prototype.isFileName = function() {
    return !String.FILEPATTERN.test(this);
};


/**
 * function cleans the string passed as argument from any characters
 * that are forbidden or shouldn't be used in filenames
 * @return Boolean
 */
String.prototype.toFileName = function() {
    return this.replace(new RegExp(String.FILEPATTERN.source, "g"), String.NULL);
};


/**
 * function checks a string for a valid color value in hexadecimal format.
 * it may also contain # as first character
 *  @returns Boolean false, if string length (without #) > 6 or < 6 or
 *              contains any character which is not a valid hex value
 */
String.prototype.isHexColor = function() {
    var str = this;
    if (this.indexOf("#") == 0)
        str = this.substring(1);
    if (str.length != 6)
        return false;
    return !String.HEXPATTERN.test(str);
};


/**
 * converts a string into a hexadecimal color
 * representation (e.g. "ffcc33"). also knows how to
 * convert a color string like "rgb (255, 204, 51)".
 * @return String the resulting hex color (w/o "#")
 */
String.prototype.toHexColor = function() {
    if (this.startsWith("rgb")) {
        res.push();
        var col = this.replace(/[^0-9,]/g, String.NULL);
        var parts = col.split(",");
        for (var i in parts) {
            var num = parseInt(parts[i], 10);
            var hex = num.toString(16);
            res.write(hex.pad("0", 2, String.LEFT));
        }
        return res.pop();
    }
    var col = this.replace(new RegExp(String.HEXPATTERN.source), String.NULL);
    return col.toLowerCase().pad("0", 6, String.LEFT);
};


/**
 * function returns true if the string contains
 * only a-z and 0-9 (case insensitive!)
 * @return Boolean true in case string is alpha, false otherwise
 */
String.prototype.isAlphanumeric = function() {
    if (!this.length)
        return false;
    return !String.ANUMPATTERN.test(this);
};


/**
 * function cleans a string by throwing away all
 * non-alphanumeric characters
 * @return cleaned string
 */
String.prototype.toAlphanumeric = function() {
    return this.replace(new RegExp(String.ANUMPATTERN.source, "g"), String.NULL);
};


/**
 * function returns true if the string contains
 * only characters a-z
 * @return Boolean true in case string is alpha, false otherwise
 */
String.prototype.isAlpha = function() {
    if (!this.length)
        return false;
    return !String.APATTERN.test(this);
};


/**
 * function returns true if the string contains
 * only 0-9
 * @return Boolean true in case string is numeric, false otherwise
 */
String.prototype.isNumeric = function() {
    if (!this.length)
        return false;
    return !String.NUMPATTERN.test(this);
};


/**
 * transforms the first n characters of a string to uppercase
 * @param Number amount of characters to transform
 * @return String the resulting string
 */
String.prototype.capitalize = function(limit) {
    if (limit == null)
        limit = 1;
    var head = this.substring(0, limit);
    var tail = this.substring(limit, this.length);
    return head.toUpperCase() + tail.toLowerCase();
};


/**
 * transforms the first n characters of each
 * word in a string to uppercase
 * @return String the resulting string
 */
String.prototype.titleize = function() {
    var parts = this.split(" ");
    res.push();
    for (var i in parts) {
        res.write(parts[i].capitalize());
        if (i < parts.length-1)
            res.write(" ");
    }
    return res.pop();
};


/**
 * translates all characters of a string into HTML entities
 * @return String translated result
 */
String.prototype.entitize = function() {
    res.push();
    for (var i=0; i<this.length; i++) {
        res.write("&#");
        res.write(this.charCodeAt(i).toString());
        res.write(";");
    }
    return res.pop();
};


/**
 * breaks up a string into two parts called
 * head and tail at the given position
 * don't apply this to HTML, i.e. use stripTags() in advance 
 * @param Number number of charactrers or of segments separated by the delimiter
 * @param String pre-/suffix to be pre-/appended to shortened string
 * @param String delimiter 
 * @return Object containing head and tail properties
 */
String.prototype.embody = function(limit, clipping, delimiter) {
   if (typeof limit == "string")
      limit = parseInt(limit, 10);
   var result = {head: this, tail: String.NULL};
   if (!limit || limit < 1)
      return result;
   if (!delimiter || delimiter == String.NULL)
      result.head= this.substring(0, limit);
   else {
      var re = new RegExp ("(" + delimiter + "+)");
      result.head = this.split(re, 2*limit - 1).join(String.NULL);
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
};


/**
 * get the head of a string
 * @see String.prototype.embody()
 */
String.prototype.head = function(limit, clipping, delimiter) {
    return this.embody(limit, clipping, delimiter).head;
};


/**
 * get the tail of a string
 * @see String.prototype.embody()
 */
String.prototype.tail = function(limit, clipping, delimiter) {
    return this.embody(limit, clipping, delimiter).tail;
};


/*
 * set clip method out of compatibility/convenience reason
 * FIXME: we eventually have to get rid of this one...
 * @see String.prototype.head()
 */
String.prototype.clip = String.prototype.head;


/**
 * function inserts a string every number of characters
 * @param Int number of characters after which insertion should take place
 * @param String string to be inserted
 * @param Boolean definitely insert at each interval position
 * @return String resulting string
 */
String.prototype.group = function(interval, str, ignoreWhiteSpace) {
    if (!interval || interval < 1)
        interval = 20;
    if (!str || this.length < interval)
        return this;
    res.push();
    for (var i=0; i<this.length; i=i+interval) {
        var strPart = this.substring(i, i+interval);
        res.write(strPart);
        if (ignoreWhiteSpace == true || 
            (strPart.length == interval && !/\s/g.test(strPart))) {
            res.write(str);
        }
    }
    return res.pop();
};


/**
 * replace all linebreaks and optionally all w/br tags
 * @param Boolean flag indicating if html tags should be replaced
 * @param String replacement for the linebreaks / html tags
 * @return String the unwrapped string
 */
String.prototype.unwrap = function(removeTags, replacement) {
    if (replacement == null)
        replacement = String.NULL;
    var str = this.replace(/[\n|\r]/g, replacement);
    if (removeTags)
        str = str.replace(/<[w]?br *\/?>/g, replacement);
    return str;    
};


/**
 * function calculates the md5 hash of a string
 * @return String md5 hash of the string
 */
String.prototype.md5 = function() {
    var str = new java.lang.String(this);
    var md = java.security.MessageDigest.getInstance('MD5');
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
};


/**
 * function repeats a string passed as argument
 * @param Int amount of repetitions
 * @return String resulting string
 */
String.prototype.repeat = function(multiplier) {
    res.push();
    for (var i=0; i<multiplier; i++)
        res.write(this);
    return res.pop();
};


/**
 * function returns true if the string starts with
 * the string passed as argument
 * @param String string pattern to search for
 * @return Boolean true in case it matches the beginning
 *            of the string, false otherwise
 */
String.prototype.startsWith = function(str, offset) {
    var javaObj = new java.lang.String(this);
    if (offset != null)
        return javaObj.startsWith(str, offset);
    return javaObj.startsWith(str);
};


/**
 * function returns true if the string ends with
 * the string passed as argument
 * @param String string pattern to search for
 * @return Boolean true in case it matches the end of
 *            the string, false otherwise
 */
String.prototype.endsWith = function(str) {
    var javaObj = new java.lang.String(this);
    return javaObj.endsWith(str);
};


/**
 * fills a string with another string up to a desired length
 * @param String the filling string
 * @param Number the desired length of the resulting string
 * @param Number the direction which the string will be padded in:
 *                    -1: left    0: both (balance)  1: right
 *                    (you can use the constants String.LEFT,
 *                     String.BALANCE and String.RIGHT here as well.)
 * @return String the resulting string
 */
String.prototype.pad = function(str, len, mode) {
    if (str  == null || len == null)
        return this;
    var diff = len - this.length;
    if (diff == 0)
        return this;
    var left, right = 0;
    if (mode == null || mode == String.RIGHT)
        right = diff;
    else if (mode == String.LEFT)
        left = diff;
    else if (mode == String.BALANCE) {
        right = Math.round(diff / 2);
        left = diff - right;
    }
    res.push();
    for (var i=0; i<left; i++)
        res.write(str);
    res.write(this);
    for (var i=0; i<right; i++)
        res.write(str);
    return res.pop();
};


/**
 * function returns true if a string contains the string
 * passed as argument
 * @param String string to search for
 * @param Int Position to start search
 * @param Boolean
 */
String.prototype.contains = function(str, fromIndex) {
    if (this.indexOf(str, fromIndex ? fromIndex : 0) > -1)
        return true;
    return false;
};


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
String.prototype.diff = function(mod, separator) {
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
    for (var i=0;i<max;i++) {
        var line = result[i];
        if (!line) {
            line = new Object();
            line.num = (i+1);
            result[i] = line;
        }
        if (d && i == d.line1) {
            if (d.deleted) {
                var del = new Array();
                for (var j=d.line0; j<d.line0+d.deleted; j++)
                    del[del.length] = orig[j];
                line.deleted = del;
            }
            if (d.inserted) {
                var ins = new Array();
                for (var j=d.line1; j<d.line1+d.inserted; j++)
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
};


/**
 * remove leading and trailing whitespace
 */
String.prototype.trim = function () {
    var s = new java.lang.String(this);
    return String(s.trim());
};


/**
 * returns true if the string looks like an e-mail
 */
String.prototype.isEmail = function() {
    return String.EMAILPATTERN.test(this);
};


/**
 * returns the amount of occurences of one string in another
 */
String.prototype.count = function(str) {
    var count = 0;
    var offset = 0;
    while ((offset = this.indexOf(str, offset)) > -1) {
        count += 1;
        offset += 1;
    }
    return count;
};


/**
 * returns the string encoded using the base64 algorithm
 */
String.prototype.enbase64 = function() {
    var bytes = new java.lang.String(this) . getBytes();
    return new Packages.sun.misc.BASE64Encoder().encode(bytes);
};


/**
 * returns the decoded string using the base64 algorithm
 */
String.prototype.debase64 = function() {
    var bytes = new Packages.sun.misc.BASE64Decoder().decodeBuffer(this);
    return String(new java.lang.String(bytes));
};


// wrapper methods for string-related 
// global helma functions

String.prototype.encode = function() {
    return encode(this);
};

String.prototype.encodeXml = function() {
    return encodeXml(this);
};

String.prototype.encodeForm = function() {
    return encodeForm(this);
};

String.prototype.format = function() {
    return format(this);
};

String.prototype.stripTags = function() {
    return this.replace(/<\/?[^>]+>/gi, '');
};

/**
 * factory to create functions for sorting objects in an array
 * @param String name of the field each object is compared with
 * @param Number order (ascending or descending)
 * @return Function ready for use in Array.prototype.sort
 */
String.Sorter = function(field, order) {
    if (!order)
        order = 1;
    var key = field + ":" + order;
    if (!String.Sorter.cache[key]) {
        String.Sorter.cache[key] = function(a, b) {
            var str1 = String(a[field] || String.NULL).toLowerCase();
            var str2 = String(b[field] || String.NULL).toLowerCase();
            if (str1 > str2)
                return order * 1;
            if (str1 < str2)
                return order * -1;
            return 0;
        };
    }
    return String.Sorter.cache[key];
};

String.Sorter.ASC = 1;
String.Sorter.DESC = -1;
String.Sorter.cache = {};


/**
 * create a string from a bunch of substrings
 * @param String one or more strings as arguments
 * @return String the resulting string
 */
String.compose = function() {
    res.push();
    for (var i=0; i<arguments.length; i++)
        res.write(arguments[i]);
    return res.pop();
};


/**
 * creates a random string (numbers and chars)
 * @param len length of key
 * @param mode determines which letters to use. null or 0 = all letters;
 *      1 = skip 0, 1, l and o which can easily be mixed with numbers;
 *      2 = use numbers only
 * @returns random string
 */
String.random = function(len, mode) {
    if (mode == 2) {
        var x = Math.random() * Math.pow(10,len);
        return Math.floor(x);
    }
    var keystr = String.NULL;
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
};


/**
 * append one string onto another and add some "glue"
 * if none of the strings is empty or null.
 * @param String the first string
 * @param String the string to be appended onto the first one
 * @param String the "glue" to be inserted between both strings
 * @return String the resulting string
 */
String.join = function(str1, str2, glue) {
    if (glue == null)
        glue = String.NULL;
    if (str1 && str2)
        return str1 + glue + str2;
    else if (str2)
        return str2;
    return str1;
};


// prevent any newly added properties from being enumerated
for (var i in String)
   String.dontEnum(i);
for (var i in String.prototype)
   String.prototype.dontEnum(i);
