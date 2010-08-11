/*
 * Copyright 1998-2005 Helma Project
 * Copyright 2010 Hannes Wallnöfer
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * @fileoverview Adds useful functions for working with JavaScript Date objects.
 */

export("format", "parse");

/**
 * Format a Date to a string.
 * For details on the format pattern, see 
 * http://java.sun.com/j2se/1.4.2/docs/api/java/text/SimpleDateFormat.html
 * 
 * @param {String} format the format pattern
 * @param {String|java.util.Locale} locale (optional) the locale as java Locale object or
 *        lowercase two-letter ISO-639 code (e.g. "en")
 * @param {String|java.util.TimeZone} timezone (optional) the timezone as java TimeZone
 *        object or  an abbreviation such as "PST", a full name such as "America/Los_Angeles",
 *        or a custom ID such as "GMT-8:00". If the id is not provided, the default timezone
 *        is used. If the timezone id is provided but cannot be understood, the "GMT" timezone
 *        is used.
 * @returns {String} the formatted Date
 * @see http://java.sun.com/j2se/1.4.2/docs/api/java/text/SimpleDateFormat.html
 */
function format(date, format, locale, timezone) {
    if (!format)
        return date.toString();
    if (typeof locale == "string") {
        locale = new java.util.Locale(locale);
    }
    if (typeof timezone == "string") {
        timezone = java.util.TimeZone.getTimeZone(timezone);
    }
    var sdf = locale ? new java.text.SimpleDateFormat(format, locale)
            : new java.text.SimpleDateFormat(format);
    if (timezone && timezone != sdf.getTimeZone())
        sdf.setTimeZone(timezone);
    return sdf.format(date);
}

/**
 * Parse a string representing a date.
 * For details on the string format, see http://tools.ietf.org/html/rfc3339.  Examples
 * include "2010", "2010-08-06", "2010-08-06T22:04:30Z", "2010-08-06T16:04:30-06".
 * 
 * @param {String} str The date string.  This follows the format specified for timestamps
 *        on the internet described in RFC 3339.  
 * @returns {Date} a date representing the given string
 * @see http://tools.ietf.org/html/rfc3339
 */
function parse(str) {
    var parts = str.split("T");
    var dateParts = parts[0].split("-");
    var year = parseInt(dateParts[0], 10) || 0;
    var month, day;
    if (dateParts.length > 1) {
        month = parseInt(dateParts[1], 10) - 1;
        if (dateParts.length === 3) {
            day = parseInt(dateParts[2], 10);
        } else {
            day = 1;
        }
    } else {
        month = 0, day = 1;
    }
    var datetime = new Date(Date.UTC(year, month, day));
    if (parts.length > 1) {
        var timeParts = parts[1].split(":");
        var hours = parseInt(timeParts[0], 10);
        var minutes = parseInt(timeParts[1], 10);
        var secFrac = parseFloat(timeParts[2], 10);
        var seconds = secFrac | 0;
        var milliseconds = Math.round(1000 * (secFrac - seconds));
        datetime.setUTCHours(hours, minutes, seconds, milliseconds);
        // check for offset
        var match = timeParts.slice(2).join(":").match(/^(\d{2})([Z+-])(.*)$/);
        if (match) {
            var type = match[2]; // Z, +, or -
            if (type !== "Z") {
                var offsetParts = match[3].split(":");
                var hoursOffset = parseInt(offsetParts[0], 10);
                var minutesOffset, secondsOffset;
                if (offsetParts.length > 1) {
                    minutesOffset = parseInt(offsetParts[1], 10);
                    if (offsetParts.length > 2) {
                        secondsOffset = parseInt(offsetParts[2], 10);
                    } else {
                        secondsOffset = 0;
                    }
                } else {
                    minutesOffset = 0, secondsOffset = 0;
                }
                var offset = -1000 * ((60 * (hoursOffset * 60) + minutesOffset * 60) + secondsOffset);
                if (type === "-") {
                    offset = -offset;
                }
                datetime = new Date(datetime.getTime() + offset);
            }
        }
    }
    return datetime;
}
