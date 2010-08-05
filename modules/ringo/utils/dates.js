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

export("format");

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
