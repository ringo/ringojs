/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 *
 * Copyright 1998-2007 Helma Software. All Rights Reserved.
 *
 * $RCSfile$
 * $Author: zumbrunn $
 * $Revision: 8717 $
 * $Date: 2007-12-13 19:30:16 +0100 (Don, 13 Dez 2007) $
 */

/**
 * @fileoverview Implements some useful macro filters.
 * <br /><br />
 * To use this optional module, its repository needs to be added to the 
 * application, for example by calling app.addRepository('modules/core/Filters.js')
 */

importModule('core.string');

/**
 * Transforms a string to lowercase.
 *
 * @see String.prototype.toLowerCase
 */
function lowercase_filter(input) {
   return (input || "").toString().toLowerCase();
}


/**
 * Transforms a string to uppercase.
 *
 * @see String.prototype.toUpperCase
 */
function uppercase_filter(input) {
   return (input || "").toString().toUpperCase();
}


/**
 * Transforms the first Character of a string to uppercase.
 *
 * @see String.prototype.capitalize
 */
function capitalize_filter(input) {
   return (input || "").toString().capitalize();
}


/**
 * Transforms the first Character of each word in a string
 * to uppercase.
 *
 * @see String.prototype.titleize
 */
function titleize_filter(input) {
   return (input || "").toString().titleize();
}


/**
 * Cuts a String at a certain position, and 
 * optionally appends a suffix, if truncation
 * has occurred.
 *
 * @see String.prototype.head
 * @param limit Maximum length
 * @param clipping Appended String, default is the empty String
 */
function truncate_filter(input, param, limit, clipping) {
   var limit = param.limit != null ? param.limit : limit;
   var clipping = param.clipping || clipping || "";
   return (input || "").toString().head(limit, clipping);
}


/**
 * Removes leading and trailing whitespaces.
 *
 * @see String.prototype.trim
 */
function trim_filter(input) {
   return (input || "").toString().trim();
}


/**
 * Removes all tags from a String.
 * Currently simply wraps Helma's stripTags-method.
 *
 * @see global.stripTags
 */
function stripTags_filter(input) {
   return stripTags((input || "").toString());
};


/**
 * Escapes the characters in a String using XML entities.
 * Currently simply wraps Helma's encodeXml-method.
 *
 * @see global.encodeXml
 */
function escapeXml_filter(input) {
   return encodeXml((input || "").toString());
}


/**
 * Escapes the characters in a String using HTML entities.
 *
 * @see http://www.google.com/codesearch?q=escapeHtml
 */
function escapeHtml_filter(input) {
   var replace = Packages.org.mortbay.util.StringUtil.replace;
   var str = (input || "").toString();
   return replace(replace(replace(replace(str, '&', '&amp;'), '"', '&quot;'), '>', '&gt;'), '<', '&lt;');
}

var h_filter = escapeHtml_filter;


/**
 * Escapes the characters in a String to be suitable 
 * to use as an HTTP parameter value.
 *
 * @see http://www.google.com/codesearch?q=escapeUrl
 * @param charset Optional String. The name of a supported
 *        character encoding.
 */
function escapeUrl_filter(input, param, charset) {
   var charset = param.charset || charset || app.getCharset();
   return java.net.URLEncoder.encode(input || "", charset);
}


/**
 * Escapes a string so it may be used in JavaScript String
 * definitions.
 */
function escapeJavaScript_filter(input) {
   var replace = Packages.org.mortbay.util.StringUtil.replace;
   var str = (input || "").toString();
   return replace(replace(replace(replace(replace(str, '"', '\\"'), "'", "\\'"), '\n', '\\n'), '\r', '\\r'), '\t', '\\t');
}


/**
 * Replaces linebreaks with HTML linebreaks.
 */
function linebreakToHtml_filter(input) {
   var replace = Packages.org.mortbay.util.StringUtil.replace;
   var str = (input || "").toString();
   return replace(str, '\n', '<br />');
}


/**
 * Performs a string replacement.
 *
 * @param old
 * @param new
 */
function replace_filter(input, param, oldString, newString) {
   var str = (input || "").toString();
   var oldString = param["old"] != null ? param["old"] : oldString;
   var newString = param["new"] != null ? param["new"] : newString;
   var replace = Packages.org.mortbay.util.StringUtil.replace;
   return replace(str, oldString, newString);
}


/**
 * Returns a substring. Simply wraps the javascript
 * method 'substring'.
 *
 * @see String.prototype.substring
 * @param from
 * @param to
 */
function substring_filter(input, param, from, to) {
   var from = param.from != null ? param.from : from;
   var to = param.to != null ? param.to : to;
   var str = (input || "").toString();
   return str.substring(from, to);
}

/**
 * Returns a formatted string representation of a Date.
 * Simply wraps javascripts Date.format-method.
 *
 * @see Date.prototype.format
 * @param format
 */
function dateFormat_filter(input, param, format) {
   var format = param.format || format;
   if (!input) {
      return;
   } else {
      return input.format(format);
   }
}

/**
 * Returns a default string if the given string was empty, undefined
 * or null.
 */
function default_filter(input, filter) {
    return (input === undefined || input == null || input == '') ?
            filter.getParameter(0) :
            input;
}

/**
 * Prepends a prefix if the given string is not empty, undefined or null.
 */
function prefix_filter(input, filter) {
    return (input === undefined || input == null || input == '') ?
            input :
            (filter.getParameter(0) || '') + input;
}

/**
 * Appends a suffix if the given string is not empty, undefined or null.
 */
function suffix_filter(input, filter) {
    return (input === undefined || input == null || input == '') ?
            input :
            input + (filter.getParameter(0) || '');
}
