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
 */

require('core/string');
require('core/date');

export('capitalize_filter',
        'dateFormat_filter',
        'default_filter',
        'escapeHtml_filter',
        'escapeJavaScript_filter',
        'escapeUrl_filter',
        'escapeXml_filter',
        'linebreakToHtml_filter',
        'lowercase_filter',
        'prefix_filter',
        'replace_filter',
        'stripTags_filter',
        'substring_filter',
        'suffix_filter',
        'titleize_filter',
        'trim_filter',
        'truncate_filter',
        'uppercase_filter',
        'wrap_filter');

/**
 * Transforms a string to lowercase.
 *
 * @see String.prototype.toLowerCase
 */
function lowercase_filter(input) {
   return String(input || "").toLowerCase();
}


/**
 * Transforms a string to uppercase.
 *
 * @see String.prototype.toUpperCase
 */
function uppercase_filter(input) {
   return String(input || "").toUpperCase();
}


/**
 * Transforms the first Character of a string to uppercase.
 *
 * @see String.prototype.capitalize
 */
function capitalize_filter(input) {
   return String(input || "").capitalize();
}


/**
 * Transforms the first Character of each word in a string
 * to uppercase.
 *
 * @see String.prototype.titleize
 */
function titleize_filter(input) {
   return String(input || "").titleize();
}


/**
 * Cuts a String at a certain position, and
 * optionally appends a suffix, if truncation
 * has occurred.
 *
 * @param limit maximum length
 * @param suffix appended String, default is "..."
 */
function truncate_filter(input, tag) {
   var limit = tag.getParameter("limit") || tag.parameters[0];
   var suffix = tag.getParameter("suffix") || tag.parameters[1] || "...";
   var result = (input || "").substring(0, limit);
   return input.length <= limit ? result : result + suffix;
}


/**
 * Removes leading and trailing whitespaces.
 *
 * @see String.prototype.trim
 */
function trim_filter(input) {
   return String(input || "").trim();
}


/**
 * Removes all tags from a String.
 * Currently simply wraps Ringo's stripTags-method.
 *
 * @see String.prototype.stripTags
 */
function stripTags_filter(input) {
   return String(input || "").stripTags();
};


/**
 * Escapes the characters in a String using XML entities.
 */
function escapeXml_filter(input) {
   throw new Error("not implemented");
}


/**
 * Escapes the characters in a String using HTML entities.
 *
 * @see String.prototype.escapeHtml
 */
function escapeHtml_filter(input) {
    return String(input || "").escapeHtml();
}

/**
 * Escapes the characters in a String to be suitable 
 * to use as an HTTP parameter value.
 *
 * @see http://www.google.com/codesearch?q=escapeUrl
 * @param charset Optional String. The name of a supported
 *        character encoding.
 */
function escapeUrl_filter(input, tag) {
   // TODO do we really have to use java.net.URLEncoder here?
   var charset = tag.getParameter('charset') || tag.parameters[0] || "utf8";
   return java.net.URLEncoder.encode(input || "", charset);
}


/**
 * Escapes a string so it may be used in JavaScript String
 * definitions.
 */
function escapeJavaScript_filter(input) {
   var str = String(input || "");
   return str.replace('"', '\\"', "g")
             .replace("'", "\\'", "g")
             .replace('\n', '\\n', "g")
             .replace('\r', '\\r', "g")
             .replace('\t', '\\t', "g");
}


/**
 * Replaces linebreaks with HTML linebreaks.
 */
function linebreakToHtml_filter(input) {
   var str = String(input || "");
   return str.replace(/\n/g, '<br />');
}


/**
 * Performs a string replacement.
 *
 * @param old
 * @param new
 */
function replace_filter(input, tag) {
   var str = String(input || "");
   var oldString = tag.getParameter("old") || tag.parameters[0];
   var newString = tag.getParameter("new") || tag.parameters[1];
   return str.replace(new RegExp(oldString, "g"), newString);
}


/**
 * Returns a substring. Simply wraps the javascript
 * method 'substring'.
 *
 * @see String.prototype.substring
 * @param from
 * @param to
 */
function substring_filter(input, tag) {
   var from = tag.getParameter("from") || tag.parameters[0];
   var to = tag.getParameter("to") || tag.parameters[1];
   var str = String(input || "");
   return str.substring(from, to);
}

/**
 * Returns a formatted string representation of a Date.
 * Simply wraps javascripts Date.format-method.
 *
 * @see Date.prototype.format
 * @param format
 */
function dateFormat_filter(input, tag) {
    var format = tag.getParameter("format") || tag.parameters[0];
    if (!input) {
        return;
    }
    if (typeof input === "number") {
        return new Date(input).format(format);
    }
    if (input instanceof Date) {
        return input.format(format);
    }
}

(function() {
    var isVisible = function(str) {
        return str !== undefined && str != null && str != '';
    }

    /**
     * Returns a default string if the given string was empty, undefined
     * or null.
     */
    this.default_filter = function(input, filter) {
        return isVisible(input) ?
                input :
                filter.getParameter(0);
    }

    /**
     * Prepends a prefix if the given string is not empty, undefined or null.
     */
    this.prefix_filter = function(input, filter) {
        return isVisible(input) ?
                (filter.getParameter(0) || '') + input :
                input;
    }

    /**
     * Appends a suffix if the given string is not empty, undefined or null.
     */
    this.suffix_filter = function(input, filter) {
        return isVisible(input) ?
                input + (filter.getParameter(0) || '') :
                input;
    }

    /**
     * Wraps a non-empty string with a prefix and suffix string.
     */
    this.wrap_filter = function(input, filter) {
        return isVisible(input) ?
                (filter.getParameter(0) || '')
                        + input
                        + (filter.getParameter(1) || '') :
                input;
    }
})();
