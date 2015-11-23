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

var ANUMPATTERN = /[^a-zA-Z0-9]/;
var APATTERN = /[^a-zA-Z]/;
var NUMPATTERN = /[^0-9]/;
var FILEPATTERN = /[^a-zA-Z0-9-_\. ]/;
var HEXPATTERN = /[^a-fA-F0-9]/;

// Email RegExp contributed by Scott Gonzalez (http://projects.scottsplayground.com/email_address_validation/)
// licensed unter MIT license - http://www.opensource.org/licenses/mit-license.php
var EMAILPATTERN = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;

// URL RegExp contributed by Diego Perini
// licensed unter MIT license - https://gist.github.com/dperini/729294
// Copyright (c) 2010-2013 Diego Perini (http://www.iport.it)
var URLPATTERN = java.util.regex.Pattern.compile("^" +
    // protocol identifier
    "(?:(?:https?|ftp)://)" +
    // user:pass authentication
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
        // IP address exclusion
        // private & local networks
        "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
        "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
        "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
        // IP address dotted notation octets
        // excludes loopback network 0.0.0.0
        // excludes reserved space >= 224.0.0.0
        // excludes network & broacast addresses
        // (first & last IP address of each class)
        "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
        "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
        "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
        // host name
        "(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)" +
        // domain name
        "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*" +
        // TLD identifier
        "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
    ")" +
    // port number
    "(?::\\d{2,5})?" +
    // resource path
    "(?:/[^\\s]*)?" +
"$", java.util.regex.Pattern.CASE_INSENSITIVE);

// Copyright (c) 2014 Chris O'Hara cohara87@gmail.com
// licensed unter MIT license - https://github.com/chriso/validator.js/blob/master/LICENSE
var INT = /^(?:[-+]?(?:0|[1-9][0-9]*))$/;
var FLOAT = /^(?:[-+]?(?:[0-9]*))(?:\.[0-9]*)?(?:[eE][\+\-]?(?:[0-9]+))?$/;

var {Binary, ByteArray, ByteString} = require('binary');
var base64;

/**
 * @fileoverview Adds useful methods to the JavaScript String type.
 */

export('isDateFormat',
       'toDate',
       'isUrl',
       'isFileName',
       'toFileName',
       'isHexColor',
       'toHexColor',
       'isAlphanumeric',
       'toAlphanumeric',
       'isAlpha',
       'isNumeric',
       'toCamelCase',
       'toDashes',
       'toUnderscores',
       'capitalize',
       'titleize',
       'entitize',
       'group',
       'digest',
       'repeat',
       'startsWith',
       'endsWith',
       'pad',
       'contains',
       'getCommonPrefix',
       'isEmail',
       'count',
       'b16encode',
       'b16decode',
       'b64encode',
       'b64decode',
       'y64encode',
       'y64decode',
       'escapeHtml',
       'escapeRegExp',
       'Sorter',
       'compose',
       'random',
       'join',
       'format',
       'isUpperCase',
       'isLowerCase',
       'isInt',
       'isFloat');

/**
 * Checks if a date format pattern is correct and a valid string to create a
 * new `java.text.SimpleDateFormat` from it.
 * @param {String} string the string
 * @returns {Boolean} true if the pattern is correct, false otherwise
 * @example strings.isDateFormat("yyyy.MM.dd G 'at' HH:mm:ss z"); // --> true
 * strings.isDateFormat(""); // --> true
 * strings.isDateFormat("PPPP"); // --> false
 */
function isDateFormat(string) {
    try {
        new java.text.SimpleDateFormat(string);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Parse a timestamp into a `Date` object.
 * @param {String} string the string
 * @param {String} format date format to be applied
 * @param {java.util.TimeZone} timezone Java TimeZone Object (optional)
 * @returns {Date} the resulting date
 * @example // Thu Dec 24 2015 00:00:00 GMT+0100 (MEZ)
 * strings.toDate("24-12-2015", "dd-MM-yyyy");
 *
 * // Thu Dec 24 2015 09:00:00 GMT+0100 (MEZ)
 * var tz = java.util.TimeZone.getTimeZone("America/Los_Angeles");
 * strings.toDate("24-12-2015", "dd-MM-yyyy", tz);
 */
function toDate(string, format, timezone) {
    var simpleDateFormat = new java.text.SimpleDateFormat(format);
    if (timezone && timezone != simpleDateFormat.getTimeZone()) {
        simpleDateFormat.setTimeZone(timezone);
    }
    return new Date(simpleDateFormat.parse(string).getTime());
}

/**
 * Checks if the string is a valid URL. Only HTTP, HTTPS and FTP are allowed protocols.
 * TLDs are mandatory so hostnames like <em>localhost</em> fail.
 * <code>1.0.0.0</code> - <code>223.255.255.255</code> is the valid IP range.
 * Though, IP addresses with a broadcast class are considered as invalid.
 *
 * @param {String} string the string
 * @returns {Boolean} true if the string is a valid URL
 * @see <a href="https://gist.github.com/dperini/729294">Diego Perini's regex-weburl.js</a>
 * @example // true
 * strings.isUrl("http://example.com");
 * strings.isUrl("https://example.com");
 * strings.isUrl("ftp://foo@bar.com");
 * strings.isUrl("http://example.com/q?exp=a|b");
 *
 * // false
 * strings.isUrl("http://localhost");
 * strings.isUrl("ftp://foo");
 * strings.isUrl("//example.com");
 * strings.isUrl("http://10.1.1.255");
 */
function isUrl(string) {
    // uses java.util.regex.Pattern for performance reasons,
    // pure JS / Rhino RegExp will not stop in feasible time!
    return (URLPATTERN.matcher(string)).matches();
}

/**
 * Checks if the string passed contains any characters
 * that are forbidden in image- or filenames.
 * Allowed characters are: <code>[a-z][A-Z][0-9]-_.</code> and blank space.
 * @param {String} string the string
 * @returns {Boolean}
 * @example // true
 * strings.isFileName("foo123.bar");
 * strings.isFileName("foo bar baz");
 * strings.isFileName("foo-bar.baz");
 * strings.isFileName("..baz");
 *
 * // false
 * strings.isFileName("../foo");
 * strings.isFileName("foo/bar/baz");
 * strings.isFileName("foo-bar+baz");
 */
function isFileName(string) {
    return !FILEPATTERN.test(string);
}

/**
 * Cleans the string passed as argument from any characters
 * that are forbidden or shouldn't be used in filenames.
 * @param {String} string the string
 * @returns {String} the sanitized string
 * @example // returns "..foobarbaz"
 * strings.toFileName("../foo/bar+baz");
 */
function toFileName(string) {
    return string.replace(new RegExp(FILEPATTERN.source, "g"), '');
}

/**
 * Checks a string for a valid color value in hexadecimal format.
 * It may also contain # as first character.
 * @param {String} string the string
 * @returns {Boolean} false, if string length (without #) > 6 or < 6 or
 *              contains any character which is not a valid hex value
 * @example // true
 * strings.isHexColor("#f0f1f4");
 * strings.isHexColor("f0f1f4");
 * strings.isHexColor("#caffee");
 *
 * // false
 * strings.isHexColor("#000");
 * strings.isHexColor("000");
 * strings.isHexColor("#matcha");
 * strings.isHexColor("#tea");
 */
function isHexColor(string) {
    if (string.indexOf("#") == 0)
        string = string.substring(1);
    return string.length == 6 &&  !HEXPATTERN.test(string);
}

/**
 * Converts a string into a hexadecimal color
 * representation (e.g. "ffcc33"). Also knows how to
 * convert a color string like "rgb (255, 204, 51)".
 * @param {String} string the string
 * @returns {String} the resulting hex color (w/o "#")
 * @deprecated This function is unreliable and a remnant from Helma's String module.
 * @example strings.toHexColor("rgb(255, 204, 51)"); // --> ffcc33
 * strings.toHexColor("rgb (255, 204, 51)"); // --> ffcc33
 * strings.toHexColor("rgba(255, 204, 51)"); // --> ffcc33
 */
function toHexColor(string) {
    if (startsWith(string, "rgb")) {
        var buffer = [];
        var col = string.replace(/[^0-9,]/g, '');
        var parts = col.split(",");
        for (var i in parts) {
            var num = parseInt(parts[i], 10);
            var hex = num.toString(16);
            buffer.push(pad(hex, "0", 2, -1));
        }
        return buffer.join("");
    }
    var color = string.replace(new RegExp(HEXPATTERN.source), '');
    return pad(color.toLowerCase(), "0", 6, -1);
}

/**
 * Returns true if the string contains only a-z, A-Z and 0-9 (case insensitive).
 * @param {String} string the string
 * @returns {Boolean} true in case string is alpha, false otherwise
 * @example strings.isAlphanumeric("foobar123"); // --> true
 * strings.isAlphanumeric("foo@example"); // --> false
 */
function isAlphanumeric(string) {
    return string.length && !ANUMPATTERN.test(string);
}

/**
 * Cleans a string by throwing away all non-alphanumeric characters.
 * @param {String} string the string
 * @returns {String} cleaned string
 * @example // returns "dogdogecom"
 * strings.toAlphanumeric("dog@doge.com");
 */
function toAlphanumeric(string) {
    return string.replace(new RegExp(ANUMPATTERN.source, "g"), '');
}

/**
 * Returns true if the string contains only characters a-z and A-Z.
 * @param {String} string the string
 * @returns {Boolean} true in case string is alpha, false otherwise
 * @example strings.isAlpha("foo"); // --> true
 * strings.isAlpha("foo123"); // --> false
 */
function isAlpha(string) {
    return string.length && !APATTERN.test(string);
}

/**
 * Returns true if the string contains only 0-9.
 * @param {String} string the string
 * @returns {Boolean} true in case string is numeric, false otherwise
 * @example strings.isNumeric("12345"); // --> true
 * strings.isNumeric("00012345"); // --> true
 * strings.isAlpha("foo123"); // --> false
 */
function isNumeric(string) {
    return string.length &&  !NUMPATTERN.test(string);
}

/**
 * Transforms string from space, dash, or underscore notation to camel-case.
 * @param {String} string a string
 * @returns {String} the resulting string
 * @example strings.toCamelCase("TheDogJumps"); // "TheDogJumps"
 * strings.toCamelCase("the-dog_jumps"); // "theDogJumps"
 * strings.toCamelCase("FOObarBaz"); // "FoobarBaz"
 */
function toCamelCase(string) {
    return string.replace(/([A-Z]+)/g, function(m, l) {
        // "ABC" -> "Abc"
        return l[0].toUpperCase() + l.substring(1).toLowerCase();
    }).replace(/[\-_\s](.)/g, function(m, l) {
        // foo-bar -> fooBar
        return l.toUpperCase();
    });
}

/**
 * Transforms string from camel-case to dash notation.
 * @param {String} string a string
 * @returns {String} the resulting string
 * @example strings.toDashes("FooBarBaz"); // "-foo-bar-baz"
 * strings.toDashes("fooBARBaz"); // "foo-b-a-r-baz"
 * strings.toDashes("foo-Bar-Baz"); // "foo--bar--baz"
 */
function toDashes(string) {
    return string.replace(/([A-Z])/g, function($1){return "-"+$1.toLowerCase();});
}

/**
 * Transforms string from camel-case to underscore notation.
 * @param {String} string a string
 * @returns {String} the resulting string
 * @example strings.toUnderscores("FooBarBaz"); // "_foo_bar_baz"
 * strings.toUnderscores("fooBARBaz"); // "foo_b_a_r_baz"
 * strings.toUnderscores("foo_Bar_Baz"); // "foo__bar__baz"
 * strings.toUnderscores("foo-Bar-Baz"); // foo-_bar-_baz
 */
function toUnderscores(string) {
    return string.replace(/([A-Z])/g, function($1){return "_"+$1.toLowerCase();});
}

/**
 * Transforms the first n characters of a string to uppercase.
 * @param {String} the string to capitalize
 * @param {Number} amount of characters to transform
 * @returns {String} the resulting string
 * @example strings.capitalize("example text"); // "Example text"
 * strings.capitalize("example text", 7); // EXAMPLE text
 */
function capitalize(string, limit) {
    if (limit == null)
        limit = 1;
    var head = string.substring(0, limit);
    var tail = string.substring(limit, this.length);
    return head.toUpperCase() + tail.toLowerCase();
}

/**
 * Transforms the first n characters of each word in a string to uppercase.
 * @param {String} string the string
 * @param {Number} amount optional number of characters to transform
 * @returns {String} the resulting string
 * @example strings.titleize("the bar is foo"); // --> "The Bar Is Foo"
 * strings.titleize("the bar is foo", 2); // --> "THe BAr IS FOo"
 * strings.titleize("the bar is foo", 3); // --> "THE BAR IS FOO"
 */
function titleize(string, amount) {
    var parts = string.split(" ");
    var buffer = [];
    for (var i in parts) {
        buffer.push(capitalize(parts[i], amount));
    }
    return buffer.join(" ");
}

/**
 * Translates all characters of a string into HTML entities.
 * Entities are encoded in decimal form of Unicode code points.
 * @param {String} string the string
 * @returns {String} translated result
 * @example strings.entitize("@foo"); // --> "&amp;#64;&amp;#102;&amp;#111;&amp;#111;"
 */
function entitize(string) {
    var buffer = [];
    for (var i = 0; i < string.length; i++) {
        buffer.push("&#", string.charCodeAt(i).toString(), ";");
    }
    return buffer.join("");
}

/**
 * Inserts a string every number of characters.
 * @param {String} string
 * @param {Number} interval number of characters after which insertion should take place, defaults to 20
 * @param {String} string to be inserted
 * @param {Boolean} ignoreWhiteSpace optional, definitely insert at each interval position
 * @returns {String} resulting string
 * @example // returns "fobaro fobaro fobaro"
 * strings.group("foo foo foo", 2, "bar");
 *
 * // returns "fobaro barfobaro barfobarobar"
 * strings.group("foo foo foo", 2, "bar", true);
 */
function group(string, interval, str, ignoreWhiteSpace) {
    if (!interval || interval < 1)
        interval = 20;
    if (!str || string.length < interval)
        return string;
    var buffer = [];
    for (var i = 0; i < string.length; i += interval) {
        var strPart = string.substring(i, i + interval);
        buffer.push(strPart);
        if (ignoreWhiteSpace == true ||
                (strPart.length == interval && !/\s/g.test(strPart))) {
            buffer.push(str);
        }
    }
    return buffer.join("");
}

/**
 * Calculates a message digest of a string. If no argument is passed, the MD5 algorithm is used.
 * All algorithms supported by <code>java.security.MessageDigest</code> can be requested.
 * Every Java platform must provide an implementation of MD5, SHA-1, and SHA-256.
 * All known popular Java platform implementations will also provide SHA-224, SHA-384, and SHA-512.
 * @param {String} string the string to digest
 * @param {String} algorithm the name of the algorithm to use
 * @returns {String} base16-encoded message digest of the string
 * @example // "C3499C2729730A7F807EFB8676A92DCB6F8A3F8F"
 * strings.digest("example", "sha-1");
 */
function digest(string, algorithm) {
    var md = java.security.MessageDigest.getInstance(algorithm || 'MD5');
    var b = ByteString.wrap(md.digest(string.toByteString()));
    return b16encode(b);
}

/**
 * Repeats a string passed as argument multiple times.
 * @param {String} string the string
 * @param {Number} num amount of repetitions
 * @returns {String} resulting string
 * @example strings.repeat("foo", 3); // --> "foofoofoo"
 */
function repeat(string, num) {
    var list = [];
    for (var i = 0; i < num; i++)
        list[i] = string;
    return list.join('');
}

/**
 * Returns true if string starts with the given substring.
 * @param {String} string the string to search in
 * @param {String} substring pattern to search for
 * @returns {Boolean} true in case it matches the beginning
 *            of the string, false otherwise
 * @example strings.startsWith("foobar", "foo"); // --> true
 * strings.startsWith("foobar", "bar"); // --> false
 */
function startsWith(string, substring) {
    return string.indexOf(substring) == 0;
}

/**
 * Returns true if string ends with the given substring.
 * @param {String} string the string to search in
 * @param {String} substring pattern to search for
 * @returns {Boolean} true in case it matches the end of
 *            the string, false otherwise
 * @example strings.endsWith("foobar", "bar"); // --> true
 * strings.endsWith("foobar", "foo"); // --> false
 */
function endsWith(string, substring) {
    var diff = string.length - substring.length;
    return diff > -1 && string.lastIndexOf(substring) == diff;
}

/**
 * Fills a string with another string up to a desired length.
 * @param {String} string the string
 * @param {String} fill the filling string
 * @param {Number} length the desired length of the resulting string
 * @param {Number} mode the direction which the string will be padded in:
 * a negative number means left, 0 means both, a positive number means right
 * @returns {String} the resulting string
 * @example // "hellowo"
 * strings.pad("hello", "world", 7);
 *
 * // "wohello"
 * strings.pad("hello", "world", 7, -1);
 *
 * // "whellow"
 * strings.pad("hello", "world", 7, 0);
 *
 * // "helloworldworldworld"
 * strings.pad("hello", "world", 20);
 *
 * // "worldwohelloworldwor"
 * strings.pad("hello", "world", 20, 0);
 */
function pad(string, fill, length, mode) {
    if (typeof string !== "string") {
        string = string.toString();
    }
    if (fill == null || length == null) {
        return string;
    }
    var diff = length - string.length;
    if (diff == 0) {
        return string;
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
        list[i] = fill[i % fill.length];
    }
    list.push(string);
    for (i = 0; i < right; i++) {
        list.push(fill[i % fill.length]);
    }
    return list.join('');
}

/**
 * Returns true if string contains substring.
 * @param {String} string the string to search in
 * @param {String} substring the string to search for
 * @param {Number} fromIndex optional index to start searching
 * @returns {Boolean} true if substring is contained in this string
 * @example strings.contains("foobar", "oba"); // --> true
 * strings.contains("foobar", "baz"); // --> false
 * strings.contains("foobar", "oo", 1); // --> true
 * strings.contains("foobar", "oo", 2); // --> false
 */
function contains(string, substring, fromIndex) {
    fromIndex = fromIndex || 0;
    return string.indexOf(substring, fromIndex) > -1;
}

/**
 * Get the longest common segment that two strings
 * have in common, starting at the beginning of the string.
 * @param {String} str1 a string
 * @param {String} str2 another string
 * @returns {String} the longest common segment
 * @example strings.getCommonPrefix("foobarbaz", "foobazbar"); // --> "fooba"
 * strings.getCommonPrefix("foobarbaz", "bazbarfoo"); // --> ""
 */
function getCommonPrefix(str1, str2) {
    if (str1 == null || str2 == null) {
        return null;
    } else if (str1.length > str2.length && str1.indexOf(str2) == 0) {
        return str2;
    } else if (str2.length > str1.length && str2.indexOf(str1) == 0) {
        return str1;
    }
    var length = Math.min(str1.length, str2.length);
    for (var i = 0; i < length; i++) {
        if (str1[i] != str2[i]) {
            return str1.slice(0, i);
        }
    }
    return str1.slice(0, length);
}

/**
 * Returns true if the string looks like an e-mail.
 * It does not perform an extended validation or any mailbox checks.
 * @param {String} string
 * @returns {Boolean} true if the string is an e-mail address
 * @example strings.isEmail("rhino@ringojs.org"); // --> true
 * strings.isEmail("rhino@ringojs"); // --> false
 */
function isEmail(string) {
    return EMAILPATTERN.test(string);
}

/**
 * Returns the amount of occurrences of one string in another.
 * @param {String} string
 * @param {String} pattern
 * @returns {Number} occurrences
 * @example strings.count("foobarfoo", "foo"); // --> 2
 */
function count(string, pattern) {
        var count = 0;
        var offset = 0;
        while ((offset = string.indexOf(pattern, offset)) > -1) {
            count += 1;
            offset += 1;
        }
        return count;
    }

/**
 * Encode a string or binary to a Base64 encoded string.
 * @param {String|Binary} string a string or binary
 * @param {String} encoding optional encoding to use if
 *     first argument is a string. Defaults to 'utf8'.
 * @returns {String} the Base64 encoded string
 * @example strings.b64encode("foob"); // --> "Zm9vYg=="
 */
function b64encode(string, encoding) {
    if (!base64) base64 = require('ringo/base64');
    return base64.encode(string, encoding);
}

/**
 * Encode a string or binary to a Y64 encoded string. Y64
 * is an URL-safe Base64 encoding and prevents any URL escaping.
 * It replaces the plus (<code>+</code>), slash (<code>/</code>)
 * and equals (<code>=</code>) with dot (<code>.</code>),
 * underscore (<code>_</code>) and dash (<code>-</code>).
 *
 * @param {String|Binary} string a string or binary
 * @param {String} encoding optional encoding to use if
 *     first argument is a string. Defaults to 'utf8'.
 * @returns {String} the Y64 encoded string
 * @see <a href="http://www.yuiblog.com/blog/2010/07/06/in-the-yui-3-gallery-base64-and-y64-encoding/">Detailed Y64 description</a>
 * @example strings.y64encode("foob"); // --> "Zm9vYg--"
 */
function y64encode(string, encoding) {
   return b64encode(string, encoding).replace(/[\+\=\/]/g, function(toReplace){
        switch(toReplace){
            case '+': return '.';
            case '=': return '-';
            case '/': return '_';
            default: throw "Invalid regex!";
        }
    });
};

/**
 * Decodes a Base64 encoded string to a string or byte array.
 * @param {String} string the Base64 encoded string
 * @param {String} encoding the encoding to use for the return value.
 *     Defaults to 'utf8'. Use 'raw' to get a ByteArray instead of a string.
 * @returns {String|ByteArray} the decoded string or ByteArray
 * @example strings.b64decode("Zm9vYg=="); // --> "foob"
 * strings.b64decode("Zm9vYg==", "raw"); // --> [ByteArray 4]
 */
function b64decode(string, encoding) {
    if (!base64) base64 = require('ringo/base64');
    return base64.decode(string, encoding);
}

/**
 * Decodes a Y64 encoded string to a string or byte array.
 * @param {String} string the Y64 encoded string
 * @param {String} encoding the encoding to use for the return value.
 *     Defaults to 'utf8'. Use 'raw' to get a ByteArray instead of a string.
 * @returns {String|ByteArray} the decoded string or ByteArray
 * @example strings.y64decode("Zm9vYg--"); // --> "foob"
 * strings.y64decode("Zm9vYg--", "raw"); // --> [ByteArray 4]
 */
function y64decode(string, encoding) {
   return b64decode(string.replace(/[\.\-\_]/g, function(toReplace){
        switch(toReplace){
            case '.': return '+';
            case '-': return '=';
            case '_': return '/';
            default: throw "Invalid regex!";
        }
    }), encoding);
};

/**
 * Encode a string or binary to a Base16 encoded string.
 * @param {String|Binary} str a string or binary
 * @param {String} encoding optional encoding to use if
 *     first argument is a string. Defaults to 'utf8'.
 * @returns {String} the Base16 encoded string
 * @example strings.b16encode("foo"); // --> "666F6F"
 */
function b16encode(str, encoding) {
    encoding = encoding || 'utf8';
    var input = str instanceof Binary ? str : String(str).toByteString(encoding);
    var length = input.length;
    var result = [];
    var chars = ['0', '1', '2', '3', '4', '5', '6', '7',
                 '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

    for (var i = 0; i < length; i++) {
        var n = input[i];
        result.push(chars[n >>> 4], chars[n & 0xf]);
    }
    return result.join('');
}

/**
 * Decodes a Base16 encoded string to a string or byte array.
 * @param {String} str the Base16 encoded string
 * @param {String} encoding the encoding to use for the return value.
 *     Defaults to 'utf8'. Use 'raw' to get a ByteArray instead of a string.
 * @returns {String|ByteArray} the decoded string or ByteArray
 * @example strings.b16decode("666F6F"); // --> "foo"
 * strings.b16decode("666F6F", "raw"); // --> [ByteArray 3]
 */
function b16decode(str, encoding) {
    var input = str instanceof Binary ? str : String(str).toByteString('ascii');
    var length = input.length / 2;
    var output = new ByteArray(length);

    function decodeChar(c) {
        if (c >= 48 && c <= 57) return c - 48;
        if (c >= 65 && c <= 70) return c - 55;
        if (c >= 97 && c <= 102) return c - 87;
        throw new Error('Invalid base16 character: ' + c);
    }

    for (var i = 0; i < length; i++) {
        var n1 = decodeChar(input[i * 2]);
        var n2 = decodeChar(input[i * 2 + 1]);
        output[i] = (n1 << 4) + n2;
    }
    encoding = encoding || 'utf8';
    return encoding == 'raw' ? output : output.decodeToString(encoding);
}

/**
 * Escape the string to make it safe for use within an HTML document.
 * Unsafe characters are <code>&amp;</code>, <code>&quot;</code>, <code>&#39;</code>,
 * <code>&#96;</code>, <code>&lt;</code>, and <code>&gt;</code>.
 * @param {String} string the string to escape
 * @return {String} the escaped string
 * @example // returns "&amp;lt;a href=&amp;#39;foo&amp;#39;&amp;gt;bar&amp;lt;/a&amp;gt;"
 * strings.escapeHtml("&lt;a href='foo'&gt;bar&lt;/a&gt;");
 */
function escapeHtml(string) {
    return String((string === null || string === undefined) ? '' : string)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;')
            .replace(/>/g, '&gt;')
            .replace(/</g, '&lt;');
}

/**
 * Accepts a string; returns the string with regex metacharacters escaped.
 * the returned string can safely be used within a regex to match a literal
 * string. escaped characters are \[, ], {, }, (, ), -, *, +, ?, ., \, ^, $,
 * |, #, \[comma], and whitespace.
 * @param {String} str the string to escape
 * @returns {String} the escaped string
 * @example // returns "/\.\*foo\+bar/"
 * strings.escapeRegExp("/.*foo+bar/");
 */
function escapeRegExp(str) {
    return str.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, "\\$&");
}

/**
 * Factory to create functions for sorting objects in an array.
 * @param {String} field name of the field each object is compared with
 * @param {Number} order (ascending or descending)
 * @returns {Function} ready for use in Array.prototype.sort
 * @example var arr = [{ name: "Foo", age: 10 }, {name: "Bar", age: 20 }];
 *
 * // returns [ { name: 'Bar', age: 20 }, { name: 'Foo', age: 10 } ]
 * var x = arr.sort(new Sorter("name", 1));
 *
 * // returns [ { name: 'Foo', age: 10 }, { name: 'Bar', age: 20 } ]
 * x.sort(new Sorter("name", -1));
 */
function Sorter(field, order) {
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

/**
 * Create a string from a bunch of substrings.
 * @param {String} one or more strings as arguments
 * @returns {String} the resulting string
 * @example strings.compose("foo", "bar", "baz"); // --> "foobarbaz"
 */
function compose() {
    return Array.prototype.join.call(arguments, '');
}

/**
 * Creates a random string (numbers and chars).
 * @param {Number} len length of key
 * @param {Number} mode determines which letters to use. null or 0 = all letters;
 *      1 = skip 0, 1, l and o which can easily be mixed with numbers;
 *      2 = use numbers only
 * @returns {String} random string
 * @example strings.random(10); // --> "wcn1v5h0tg"
 * strings.random(10, 1); // --> "bqpfj36tn4"
 * strings.random(10, 2); // --> 5492950742
 */
function random(len, mode) {
    if (mode == 2) {
        var x = Math.random() * Math.pow(10, len);
        return Math.floor(x);
    }
    var keystr = '';
    for (var i = 0; i < len; i++) {
        x = Math.floor((Math.random() * 36));
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

/**
 * Append one string onto another and add some "glue"
 * if none of the strings is empty or null.
 * @param {String} the first string
 * @param {String} the string to be appended onto the first one
 * @param {String} the "glue" to be inserted between both strings
 * @returns {String} the resulting string
 * @example strings.join("foo", "bar"); // "foobar"
 * strings.join("foo", "bar", "-"); // "foo-bar"
 * strings.join("foo", "",  "-"); // "foo"
 */
function join(str1, str2, glue) {
    if (glue == null)
        glue = '';
    if (str1 && str2)
        return str1 + glue + str2;
    else if (str2)
        return str2;
    return str1;
}


/**
 * A simple string formatter. If the first argument is a format string
 * containing a number of curly bracket pairs {} as placeholders,
 * the same number of following arguments will be used to replace the curly
 * bracket pairs in the format string. If the first argument is not a string
 * or does not contain any curly brackets, the arguments are simply concatenated
 * to a string and returned.
 *
 * @param {String} format string, followed by a variable number of values
 * @return {String} the formatted string
 * @example // "My age is 10!"
 * strings.format("My {} is {}!", "age", 10);
 *
 * // My age is 10! 20 30
 * strings.format("My {} is {}!", "age", 10, 20, 30);
 */
function format() {
    if (arguments.length == 0) {
        return "";
    }
    var format = arguments[0];
    var index = 1;
    // Replace placehoder with argument as long as possible
    if (typeof format === "string") {
        if (contains(format, "{}") && arguments.length > 1) {
            var args = arguments;
            format = format.replace(/{}/g, function(m) {
                return index < args.length ? args[index++] : m;
            });
        }
    } else {
        format = String(format);
    }
    // append remaining arguments separated by " "
    if (index < arguments.length) {
        return [format].concat(Array.prototype.slice.call(arguments, index).map(String)).join(" ");
    } else {
        return format;
    }
}

/**
 * Returns true if the string is uppercase.
 * @param {String} string
 * @returns {Boolean} true if uppercase, false otherwise
 * @example strings.isUpperCase("FOO"); // --> true
 * strings.isUpperCase("FOo"); // --> false
 */
function isUpperCase(string) {
    return string.toUpperCase() === string;
}

/**
 * Returns true if the string is lowercase.
 * @param {String} string
 * @returns {Boolean} true if lowercase, false otherwise
 * @example strings.isLowerCase("foo"); // --> true
 * strings.isLowerCase("Foo"); // --> false
 */
function isLowerCase(string) {
    return string.toLowerCase() === string;
}

/**
 * Returns true if the string is an integer literal.
 * @param {String} string
 * @returns {Boolean} true if integer literal, false otherwise
 * @see <a href="https://github.com/chriso/validator.js/">chriso/validator.js</a>
 * @example strings.isInt("0"); // --> true
 * strings.isInt("123"); // --> true
 * strings.isInt("+123"); // --> true
 * strings.isInt("-123"); // --> true
 *
 * strings.isInt("0123"); // --> false
 * strings.isInt("bar"); // --> false
 */
function isInt(string) {
    return INT.test(string);
};

/**
 * Returns true if the string is a floating point literal.
 * @param {String} string
 * @returns {Boolean} true if floating point literal, false otherwise
 * @see <a href="https://github.com/chriso/validator.js/">chriso/validator.js</a>
 * @example strings.isFloat("0.0"); // --> true
 * strings.isFloat("10.01234"); // --> true
 * strings.isFloat("-0.0"); // --> true
 * strings.isFloat("+10.0"); // --> true
 *
 * strings.isFloat("foo"); // --> false
 * strings.isFloat("0"); // --> false
 */
function isFloat(string) {
    return string !== '' && FLOAT.test(string) && !INT.test(string);
};
