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
 * @example const dates = require("ringo/utils/dates");
 * const now = new Date(2016, 0, 1);
 * const y2k = new Date(2000, 0, 1);
 *
 * dates.after(now, y2k); // --> true
 * dates.before(now, y2k); // --> false
 * dates.isLeapYear(y2k); // --> true
 * dates.weekOfYear(y2k); // --> 52 (1st week starts at 3rd)
 * dates.yearInCentury(y2k); // --> 0
 * dates.diff(y2k, now); // --> 5844
 * dates.diff(y2k, now, "mixed"); // { days: 5844, hours: 0, ... }
 */

const {Calendar} = java.util;
const {Instant, ZoneOffset} = java.time;

// Helper
/** @ignore */
const createGregorianCalender = (date, locale) => {
    const cal = locale ? new java.util.GregorianCalendar(locale) : new java.util.GregorianCalendar();
    cal.set(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
    cal.set(Calendar.MILLISECOND, date.getMilliseconds());
    return cal;
};

/**
 * Format a Date to a string in a locale-sensitive manner.
 * For details on the format pattern, see
 * <a href="http://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html">
 *     java.text.SimpleDateFormat
 * </a>.
 *
 * @param {Date} date the Date to format
 * @param {String} format the format pattern
 * @param {String|java.util.Locale} locale (optional) the locale as java Locale object or
 *        lowercase two-letter ISO-639 code (e.g. "en")
 * @param {String|java.util.TimeZone} timezone (optional) the timezone as java TimeZone
 *        object or  an abbreviation such as "PST", a full name such as "America/Los_Angeles",
 *        or a custom ID such as "GMT-8:00". If the id is not provided, the default timezone
 *        is used. If the timezone id is provided but cannot be understood, the "GMT" timezone
 *        is used.
 * @returns {String} the formatted Date
 * @see <a href="http://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html">java.text.SimpleDateFormat</a>
 * @example const y2k = new Date(Date.UTC(2000, 0, 1));
 * // "year 2000"
 * dates.format(y2k, "'year' yyyy");
 * // "Samstag, Januar 1, '00"
 * dates.format(y2k, "EEEE, MMMM d, ''yy", "de");
 * // "1999-12-31"
 * dates.format(y2k, "yyyy-MM-dd", "de", "GMT-1");
 * // "2000-01-01 00:00:00 GMT-00:00"
 * dates.format(y2k, "yyyy-MM-dd HH:mm:ss z", "de", "GMT-0");
 * // "1999-12-31 14:00:00 GMT-10:00"
 * dates.format(y2k, "yyyy-MM-dd HH:mm:ss z", "de", "GMT-10");
 */
exports.format = (date, format, locale, timezone) => {
    if (!format) {
        return date.toString();
    }
    if (typeof locale == "string") {
        locale = new java.util.Locale(locale);
    }
    if (typeof timezone == "string") {
        timezone = java.util.TimeZone.getTimeZone(timezone);
    }

    const sdf = locale ? new java.text.SimpleDateFormat(format, locale) : new java.text.SimpleDateFormat(format);
    if (timezone && timezone != sdf.getTimeZone()) {
        sdf.setTimeZone(timezone);
    }
    return sdf.format(date);
};

/**
 * Checks if the date is a valid date.
 *
 * @example // 2007 is no leap year, so no 29th February
 * dates.checkDate(2007, 1, 29); // --> false
 *
 * @param {Number} fullYear
 * @param {Number} month between 0 and 11
 * @param {Number} day between 1 and 31
 * @returns {Boolean} true, if the date is valid, false if not.
 */
exports.checkDate = (fullYear, month, day) => {
    if (fullYear == null || month == null || day == null) {
        return false;
    }

    const d = new Date(fullYear, month, day);
    return d.getFullYear() === fullYear && d.getMonth() === month && d.getDate() === day;
};

/**
 * Adds delta to the given field or reduces it, if delta is negative. If larger fields are effected,
 * they will be changed accordingly.
 *
 * @param {Date} date base date to add or remove time from.
 * @param {Number} delta amount of time to add (positive delta) or remove (negative delta).
 * @param {String} unit (optional) field to change. Possible values: <code>year</code>, <code>quarter</code>, <code>month</code>,
 *        <code>week</code>, <code>day</code> (default), <code>hour</code> (24-hour clock), <code>minute</code>, <code>second</code>,
 *        <code>millisecond</code>, and their respective plural form.
 * @returns {Date} date with the calculated date and time
 * @see <a href="http://docs.oracle.com/javase/8/docs/api/java/util/GregorianCalendar.html#add-int-int-">java.util.GregorianCalendar add()</a>
 * @example const d1 = new Date(Date.UTC(2016, 0, 1, 0, 0));
 * const d2 = dates.add(d1, 1, "hour");
 * dates.diff(d1, d2, "hours"); // --> 1
 */
exports.add = (date, delta, unit) => {
    unit = (typeof unit === 'undefined') ? "day" : unit;
    delta || (delta = 0);
    const cal = createGregorianCalender(date);

    switch (unit) {
        case "year":
        case "years":
            cal.add(Calendar.YEAR, delta);
            break;
        case "quarter":
        case "quarters":
            cal.add(Calendar.MONTH, delta * 3);
            break;
        case "month":
        case "months":
            cal.add(Calendar.MONTH, delta);
            break;
        case "week":
        case "weeks":
            cal.add(Calendar.WEEK_OF_YEAR, delta);
            break;
        case "day":
        case "days":
            cal.add(Calendar.DATE, delta);
            break;
        case "hour":
        case "hours":
            cal.add(Calendar.HOUR_OF_DAY, delta);
            break;
        case "minute":
        case "minutes":
            cal.add(Calendar.MINUTE, delta);
            break;
        case "second":
        case "seconds":
            cal.add(Calendar.SECOND, delta);
            break;
        case "millisecond":
        case "milliseconds":
            return new Date(date.getTime() + delta);
        default:
            throw new Error("Invalid unit: " + unit);
    }
    return new Date(cal.getTimeInMillis());
};

/**
 * Checks if the date's year is a leap year.
 *
 * @param {Date} date to check year
 * @returns {Boolean} true if the year is a leap year, false if not.
 */
const isLeapYear = exports.isLeapYear = (date) => {
    const year = date.getFullYear();
    return year % 4 === 0 && (year % 100 !== 0 || (year % 400 === 0));
};

/**
 * Checks if date <code>a</code> is before date <code>b</code>. This is equals to <code>compareTo(a, b) &lt; 0</code>
 *
 * @param {Date} a first date
 * @param {Date} b second date
 * @returns {Boolean} true if <code>a</code> is before <code>b</code>, false if not.
 */
exports.before = (a, b) => {
    return a.getTime() < b.getTime();
};

/**
 * Checks if date <code>a</code> is after date <code>b</code>. This is equals to <code>compare(a, b) &gt; 0</code>
 *
 * @param {Date} a first date
 * @param {Date} b second date
 * @returns {Boolean} true if <code>a</code> is after <code>b</code>, false if not.
 */
exports.after = (a, b) => {
    return a.getTime() > b.getTime();
};

/**
 * Compares the time values of <code>a</code> and <code>b</code>.
 *
 * @param {Date} a first date
 * @param {Date} b second date
 * @returns {Number} -1 if <code>a</code> is before <code>b</code>, 0 if equals and 1 if <code>a</code> is after <code>b</code>.
 * @see <a href="http://docs.oracle.com/javase/8/docs/api/java/util/Calendar.html#compareTo-java.util.Calendar-">java.util.Calendar compareTo()</a>
 */
exports.compare = (a, b) => {
    if (a.getTime() === b.getTime()) {
        return 0;
    } else if (a.getTime() < b.getTime()) {
        return -1;
    }
    return 1;
};

/**
 * Gets the first day of the week.
 *
 * @param {java.util.Locale} locale (optional) the locale as java Locale
 * @returns {Number} the first day of the week; 1 = Sunday, 2 = Monday.
 * @see <a href="http://docs.oracle.com/javase/8/docs/api/constant-values.html#java.util">java.util.Calendar constant field values</a>
 */
exports.firstDayOfWeek = (locale) => {
    const calendar = locale ? Calendar.getInstance(locale) : Calendar.getInstance();
    return calendar.getFirstDayOfWeek();
};

/**
 * Gets the second of the day for the given date.
 * @param {Date} date calculate the second of the day.
 * @returns {Number} second of the day
 */
exports.secondOfDay = (date) => {
    return (date.getHours() * 3600) + (date.getMinutes() * 60) + date.getSeconds();
};

/**
 * Gets the day of the year for the given date.
 * @param {Date} date calculate the day of the year.
 * @returns {Number} day of the year
 */
exports.dayOfYear = (date) => {
    return createGregorianCalender(date).get(Calendar.DAY_OF_YEAR);
};

/**
 * Gets the week of the month for the given date.
 * @param {Date} date calculate the week of the month.
 * @param {java.util.Locale} locale (optional) the locale as java Locale
 * @returns {Number} week of the month
 */
exports.weekOfMonth = (date, locale) => {
    return createGregorianCalender(date, locale).get(Calendar.WEEK_OF_MONTH);
};

/**
 * Gets the week of the year for the given date.
 * @param {Date} date calculate the week of the year.
 * @param {java.util.Locale} locale (optional) the locale as java Locale
 * @returns {Number} week of the year
 */
exports.weekOfYear = (date, locale) => {
    return createGregorianCalender(date, locale).get(Calendar.WEEK_OF_YEAR);
};

/**
 * Gets the year of the century for the given date.
 * @param {Date} date calculate the year of the century.
 * @returns {Number} second of the day
 * @example dates.yearInCentury(new Date(1900, 0, 1)); // --> 0
 * dates.yearInCentury(new Date(2016, 0, 1)); // --> 16
 */
exports.yearInCentury = (date) => {
    const year = date.getFullYear();
    return year - (Math.floor(year / 100) * 100);
};

/**
 * Gets the number of the days in the month.
 * @param {Date} date to find the maximum number of days.
 * @returns {Number} days in the month, between 28 and 31.
 */
exports.daysInMonth = (date) => {
    return createGregorianCalender(date).getActualMaximum(Calendar.DAY_OF_MONTH);
};

/**
 * Gets the number of the days in the year.
 * @param {Date} date to find the maximum number of days.
 * @returns {Number} days in the year, 365 or 366, if it's a leap year.
 */
exports.daysInYear = (date) => {
    return isLeapYear(date) ? 366 : 365;
};

/**
 * Gets the number of the days in february.
 * @param {Date} date of year to find the number of days in february.
 * @returns {Number} days in the february, 28 or 29, if it's a leap year.
 */
exports.daysInFebruary = (date) => {
    return isLeapYear(date) ? 29 : 28;
};

/**
 * Gets the quarter in the year.
 * @param {Date} date to calculate the quarter for.
 * @returns {Number} quarter of the year, between 1 and 4.
 */
const quarterInYear = exports.quarterInYear = (date) => {
    switch (createGregorianCalender(date).get(Calendar.MONTH)) {
        case Calendar.JANUARY:
        case Calendar.FEBRUARY:
        case Calendar.MARCH:
            return 1;
        case Calendar.APRIL :
        case Calendar.MAY :
        case Calendar.JUNE :
            return 2;
        case Calendar.JULY :
        case Calendar.AUGUST :
        case Calendar.SEPTEMBER :
            return 3;
        case Calendar.OCTOBER :
        case Calendar.NOVEMBER :
        case Calendar.DECEMBER :
            return 4;
    }

    throw "Invalid date provided";
};

/**
 * Gets the quarter in the fiscal year.
 * @param {Date} date to calculate the quarter for.
 * @param {Date} fiscalYearStart first day in the fiscal year, default is the start of the current year
 * @returns {Number} quarter of the year, between 1 and 4.
 * @example // Farmers (grassland calendar starts with 1st May)
 * // returns 4th quarter
 * dates.quarterInFiscalYear(new Date(2016, 3, 30), new Date(0, 4, 1));
 */
exports.quarterInFiscalYear = (date, fiscalYearStart) => {
    const firstDay = fiscalYearStart.getDate();
    const firstMonth = fiscalYearStart.getMonth();
    if (firstDay === 29 && firstMonth === 1) {
        throw "Fiscal year cannot start on 29th february.";
    }

    let year = date.getFullYear();
    // fiscal year starts in the year before the date
    if (date.getMonth() < firstMonth ||
            (date.getMonth() === firstMonth && date.getDate() < firstDay)) {
        year --;
    }

    const currentFiscalYear = [
        new Date(year, firstMonth, firstDay),
        new Date(year, firstMonth + 3, firstDay),
        new Date(year, firstMonth + 6, firstDay),
        new Date(year, firstMonth + 9, firstDay),
        new Date(year, firstMonth + 12, firstDay)
    ];

    for (let i = 1; i <= 4; i++) {
        if (inPeriod(date, currentFiscalYear[i-1], currentFiscalYear[i], false, true)) {
            return i;
        }
    }

    throw "Kudos! You found a bug, if you see this message. Report it!";
};

/**
 * Get the difference between two dates, specified by the unit of time.
 * @param {Date} a first date
 * @param {Date} b second date
 * @param {String} unit (optional) of time to return. Possible values: <code>year</code>, <code>quarter</code>, <code>month</code>,
 *        <code>week</code>, <code>day</code> (default), <code>hour</code>, <code>minute</code>, <code>second</code>, <code>millisecond</code> and
 *        <code>mixed</code> (returns an object); and their respective plural form.
 * @returns difference between the given dates in the specified unit of time.
 * @type Number|Object<days, hours, minutes, seconds, milliseconds>
 * @example const d1 = new Date(Date.UTC(2016, 0, 1, 0, 0));
 * const d2 = new Date(Date.UTC(2017, 0, 1));
 * dates.diff(d1, d2, "years"); // --> 1
 * dates.diff(d1, d2, "year"); // --> 1
 * dates.diff(d1, d2, "minutes"); // --> 527040
 * dates.diff(d1, d2, "mixed"); // --> { days: 366, hours: 0, … }
 */
const diff = exports.diff = (a, b, unit) => {
    unit = (typeof unit === 'undefined') ? "day" : unit;
    const mDiff = Math.abs(a.getTime() - b.getTime());
    const yDiff = a.getFullYear() - b.getFullYear();
    let delta = mDiff;

    switch (unit) {
        case "mixed":
            return {
                "days":           Math.floor(delta / 86400000),
                "hours":          Math.floor((delta % 86400000) / 3600000),
                "minutes":        Math.floor(((delta % 86400000) % 3600000) / 60000),
                "seconds":        Math.floor((((delta % 86400000) % 3600000) % 60000) / 1000),
                "milliseconds":   Math.floor((((delta % 86400000) % 3600000) % 60000) % 1000)
            };
        case "year":
        case "years":
            delta = Math.abs(yDiff); // just return the yDiff
            break;
        case "quarter":
        case "quarters":
            delta = Math.abs((yDiff * 4) + quarterInYear(a) - quarterInYear(b));
            break;
        case "month":
        case "months":
            delta = Math.abs((yDiff * 12) + a.getMonth() - b.getMonth());
            break;
        case "week":
        case "weeks":
            delta = Math.floor(diff(a, b, "day") / 7);
            break;
        case "day":
        case "days":
            delta /= 24;
        case "hour":
        case "hours":
            delta /= 60;
        case "minute":
        case "minutes":
            delta /= 60;
        case "second":
        case "seconds":
            delta /= 1000;
            break;
        case "millisecond":
        case "milliseconds":
            break; // delta is by default the diff in millis
        default:
            throw new Error("Invalid unit: " + unit)
    }

    return Math.floor(delta);
};

// By Dominik Gruber, written for Tenez.at
/**
 * Look if two periods are overlapping each other.
 * @param {Date} aStart first period's start
 * @param {Date} aEnd first period's end
 * @param {Date} bStart second period's start
 * @param {Date} bEnd second period's end
 * @returns {Boolean} true if the periods are overlapping at some point, false if not.
 */
exports.overlapping = (aStart, aEnd, bStart, bEnd) => {
    aStart = aStart.getTime();
    aEnd = aEnd.getTime();
    bStart = bStart.getTime();
    bEnd = bEnd.getTime();

    // A     |----|
    // B  |----|
    if (aStart >= bStart && aStart <= bEnd && aEnd >= bStart && aEnd >= bEnd) {
        return true;
    }

    // A  |----|
    // B    |----|
    if (aStart <= bStart && aStart <= bEnd && aEnd >= bStart && aEnd <= bEnd) {
        return true;
    }

    // A  |-------|
    // B    |--|
    if (aStart <= bStart && aStart <= bEnd && aEnd >= bStart && aEnd >= bEnd) {
        return true;
    }

    // A    |--|
    // B  |-------|
    return aStart >= bStart && aStart <= bEnd && aEnd >= bStart && aEnd <= bEnd;
};

/**
 * Look if the date is in the period, using <em>periodStart &lt;= date &lt;= periodEnd</em>.
 * @param {Date} date to check, if it's in the period
 * @param {Date} periodStart the period's start
 * @param {Date} periodEnd the period's end
 * @param {Boolean} periodStartOpen start point is open - default false.
 * @param {Boolean} periodEndOpen end point is open - default false.
 * @returns {Boolean} true if the date is in the period, false if not.
 */
const inPeriod = exports.inPeriod = (date, periodStart, periodEnd, periodStartOpen, periodEndOpen) => {
    const pStart = periodStart.getTime();
    const pEnd = periodEnd.getTime();
    const pStartOpen = periodStartOpen || false;
    const pEndOpen   = periodEndOpen || false;
    const dateMillis = date.getTime();

    if (!pStartOpen && !pEndOpen && pStart <= dateMillis && dateMillis <= pEnd) {
        // period  |-------|
        // date       ^
        return true;
    } else if (!pStartOpen && pEndOpen && pStart <= dateMillis && dateMillis < pEnd) {
        // period  |-------)
        // date       ^
        return true;
    } else if (pStartOpen && !pEndOpen && pStart < dateMillis && dateMillis <= pEnd) {
        // period  (-------|
        // date       ^
        return true;
    } else if (pStartOpen && pEndOpen && pStart < dateMillis && dateMillis < pEnd) {
        // period  (-------)
        // date       ^
        return true;
    }
    return false;
}

/**
 * Resets the time values to 0, keeping only year, month and day.
 * @param {Date} date to reset
 * @returns {Date} date without any time values
 * @example const d = new Date(2016, 5, 10, 10, 20, 30);
 *
 * // Fri Jun 10 2016 00:00:00 GMT+0200 (MESZ)
 * dates.resetTime(d);
 */
exports.resetTime = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * Drops the date values, keeping only hours, minutes, seconds and milliseconds.
 * @param {Date} date to reset
 * @returns {Date} date with the original time values and 1970-01-01 as date.
 * @example const d = new Date(2016, 5, 10, 10, 20, 30);
 *
 * // Thu Jan 01 1970 10:20:30 GMT+0100 (MEZ)
 * dates.resetDate(d);
 */
exports.resetDate = (date) => {
    return new Date(1970, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
};

/**
 * Creates an ISO 8601 compatible string from the date. This is similar to <code>Date.toISOString()</code>, which
 * only returns an UTC-based string. If you don't need a timezone, <code>Date.toISOString()</code> will be the better
 * choice. Use this function only if you need to include the timezone offset in your string, or if you need to control
 * the granularity of the output fields.
 *
 * @param {Date} date to format
 * @param {Boolean} withTime if true, the string will contain the time, if false only the date. Default is true.
 * @param {Boolean} withTimeZone if true, the string will be in local time, if false it's in UTC. Default is false.
 * @param {Boolean} withSeconds if true, the string will contain also the seconds of the date. Default is true.
 * @param {Boolean} withMilliseconds if true, the string will contain the millisecond part of the date. Default is true.
 * @returns {String} date as ISO 8601 string.
 * @example // "2018-08-08T17:16:44.926+02:00"
 * dates.toISOString(new Date(), true, true);
 */
exports.toISOString = (date, withTime, withTimeZone, withSeconds, withMilliseconds) => {
    let year, month, day, hours, minutes, seconds, milliseconds, str;

    withTime = withTime !== false;
    withTimeZone = withTimeZone === true;
    withSeconds = withSeconds !== false;
    withMilliseconds = withMilliseconds !== false;

    // use local time if output is not in UTC
    if (withTimeZone) {
        year  = date.getFullYear();
        month = date.getMonth();
        day   = date.getDate();
        hours = date.getHours();
        minutes = date.getMinutes();
        seconds = date.getSeconds();
        milliseconds = date.getMilliseconds();
    } else { // use UTC
        year  = date.getUTCFullYear();
        month = date.getUTCMonth();
        day   = date.getUTCDate();
        hours = date.getUTCHours();
        minutes = date.getUTCMinutes();
        seconds = date.getUTCSeconds();
        milliseconds = date.getUTCMilliseconds();
    }

    str = year + "-" + ("0".repeat(2) + (month + 1)).slice(-2) + "-" + ("0".repeat(2) + day).slice(-2);

    // Append the time
    if (withTime) {
        str += "T" + ("0".repeat(2) + hours).slice(-2) + ":" + ("0".repeat(2) + minutes).slice(-2);
        if (withSeconds) {
            str += ":" + ("0".repeat(2) + seconds).slice(-2);

            if (withMilliseconds) {
                str += "." + ("0".repeat(3) + milliseconds).slice(-3);
            }
        }
    }

    // Append the timezone offset
    if (withTime && withTimeZone) {
        const offset  = date.getTimezoneOffset(),
        inHours   = Math.floor(Math.abs(offset / 60)),
        inMinutes = Math.abs(offset) - (inHours * 60);

        // Write the time zone offset in hours
        if (offset <= 0) {
            str += "+";
        } else {
            str += "-";
        }
        str += ("0".repeat(2) + inHours).slice(-2) + ":" + ("0".repeat(2) + inMinutes).slice(-2);
    } else if(withTime) {
        str += "Z"; // UTC indicator
    }

    return str;
};

/**
 * Create new Date from UTC timestamp.
 * This is an alternative to <code>new Date(Date.UTC(…));</code>
 * @param {Number} year
 * @param {Number} month
 * @param {Number} date
 * @param {Number} hour (optional, default 0)
 * @param {Number} minute (optional, default 0)
 * @param {Number} second (optional, default 0)
 * @param {Number} millisecond (optional, default 0)
 * @returns {Date}
 */
exports.fromUTCDate = (year, month, date, hour, minute, second, millisecond) => {
    return new Date(Date.UTC(year, month, date, hour || 0 , minute || 0, second || 0, millisecond || 0));
};

/**
 * Parse a string to a date using date and time patterns from Java's <code>SimpleDateFormat</code>.
 * If no format is provided, the default follows RFC 3339 for timestamps on the internet.
 * The parser matches the pattern against the string with lenient parsing: Even if the input is not
 * strictly in the form of the pattern, but can be parsed with heuristics, then the parse succeeds.
 *
 * @example  // parses input string as local time:
 * // Wed Jun 29 2016 12:11:10 GMT+0200 (MESZ)
 * let pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS";
 * dates.parse("2016-06-29T12:11:10.001", pattern);
 *
 * // enforces UTC on the input date string
 * // Wed Jun 29 2016 14:11:10 GMT+0200 (MESZ)
 * dates.parse("2016-06-29T12:11:10.001", pattern, "en", "UTC");
 *
 * // accepting month names in German
 * dates.parse("29. Juni 2016", "dd. MMM yyyy", "de", "UTC");
 *
 * // Fri Jan 01 2016 01:00:00 GMT+0100 (MEZ)
 * dates.parse("2016");
 *
 * // Sat Aug 06 2016 02:00:00 GMT+0200 (MESZ)
 * dates.parse("2016-08-06");
 *
 * // Sun Aug 07 2016 00:04:30 GMT+0200 (MESZ)
 * dates.parse("2016-08-06T22:04:30Z");
 *
 * // Sun Aug 07 2016 00:04:30 GMT+0200 (MESZ)
 * dates.parse("2016-08-06T16:04:30-06");
 *
 * @param {String} str The date string.
 * @param {String} format (optional) a specific format pattern for the parser
 * @param {String|java.util.Locale} locale (optional) the locale as <code>java.util.Locale</code> object or
 *        an ISO-639 alpha-2 code (e.g. "en", "de") as string
 * @param {String|java.util.TimeZone} timezone (optional) the timezone as java TimeZone
 *        object or  an abbreviation such as "PST", a full name such as "America/Los_Angeles",
 *        or a custom ID such as "GMT-8:00". If the id is not provided, the default timezone is used.
 *        If the timezone id is provided but cannot be understood, the "GMT" timezone is used.
 * @param {Boolean} lenient (optional) disables lenient parsing if set to false.
 * @returns {Date|NaN} a date representing the given string, or <code>NaN</code> for unrecognizable strings
 * @see <a href="http://tools.ietf.org/html/rfc3339">RFC 3339: Date and Time on the Internet: Timestamps</a>
 * @see <a href="http://www.w3.org/TR/NOTE-datetime">W3C Note: Date and Time Formats</a>
 * @see <a href="https://es5.github.io/#x15.9.4.2">ES5 Date.parse()</a>
 */
exports.parse = (str, format, locale, timezone, lenient) => {
    let date;
    // if a format is provided, use java.text.SimpleDateFormat
    if (typeof format === "string") {
        if (typeof locale === "string") {
            locale = new java.util.Locale(locale);
        }

        if (typeof timezone === "string") {
            timezone = java.util.TimeZone.getTimeZone(timezone);
        }

        const sdf = locale ? new java.text.SimpleDateFormat(format, locale) : new java.text.SimpleDateFormat(format);

        if (timezone && timezone !== sdf.getTimeZone()) {
            sdf.setTimeZone(timezone);
        }

        try {
            // disables lenient mode, switches to strict parsing
            if (lenient === false) {
                sdf.setLenient(false);
            }

            const ppos = new java.text.ParsePosition(0);
            const javaDate = sdf.parse(str, ppos);

            // strict parsing & error during parsing --> return NaN
            if (lenient === false && ppos.getErrorIndex() >= 0) {
                return NaN;
            }

            date = javaDate != null ? new Date(javaDate.getTime()) : NaN;
        } catch (e) {
            if (!(e.javaException instanceof java.text.ParseException)) {
                throw e;
            }
            date = NaN;
        }
    } else {
        // no date format provided, fall back to RFC 3339
        // first check if the native parse method can parse it
        const elapsed = Date.parse(str);
        if (!isNaN(elapsed)) {
            date = new Date(elapsed);
        } else {
            const match = str.match(/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?(Z|(?:[+-]\d{1,2}(?::(\d{2}))?))?)?$/);
            if (match && (match[1] || match[7])) { // must have at least year or time
                const year = parseInt(match[1], 10) || 0;
                const month = (parseInt(match[2], 10) - 1) || 0;
                const day = parseInt(match[3], 10) || 1;

                date = new Date(Date.UTC(year, month, day));

                // Check if the given date is valid
                if (date.getUTCMonth() !== month || date.getUTCDate() !== day) {
                    return NaN;
                }

                // optional time
                if (match[4] !== undefined) {
                    const type = match[7];
                    const hours = parseInt(match[4], 10);
                    const minutes = parseInt(match[5], 10);
                    const secFrac = parseFloat(match[6]) || 0;
                    const seconds = secFrac | 0;
                    const milliseconds = Math.round(1000 * (secFrac - seconds));

                    // Checks if the time string is a valid time.
                    const validTimeValues = function (hours, minutes, seconds) {
                        if (hours === 24) {
                            if (minutes !== 0 || seconds !== 0 || milliseconds !== 0) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                        return true;
                    };

                    // Use UTC or local time
                    if (type !== undefined) {
                        date.setUTCHours(hours, minutes, seconds, milliseconds);
                        if (date.getUTCHours() !== hours || date.getUTCMinutes() !== minutes || date.getUTCSeconds() !== seconds) {
                            if (!validTimeValues(hours, minutes, seconds, milliseconds)) {
                                return NaN;
                            }
                        }

                        // Check offset
                        if (type !== "Z") {
                            const hoursOffset = parseInt(type, 10);
                            const minutesOffset = parseInt(match[8]) || 0;
                            const offset = -1000 * (60 * (hoursOffset * 60) + minutesOffset * 60);

                            // check maximal timezone offset (24 hours)
                            if (Math.abs(offset) >= 86400000) {
                                return NaN;
                            }
                            date = new Date(date.getTime() + offset);
                        }
                    } else {
                        date.setHours(hours, minutes, seconds, milliseconds);
                        if (date.getHours() !== hours || date.getMinutes() !== minutes || date.getSeconds() !== seconds) {
                            if (!validTimeValues(hours, minutes, seconds, milliseconds)) {
                                return NaN;
                            }
                        }
                    }
                }
            } else {
                date = NaN;
            }
        }
    }
    return date;
};

/**
 * Converts the given date to a <code>java.time.Instant</code> instance. Helps to interact with the
 * <code>java.time</code> API for dates, times, and durations.
 *
 * @param date {Date} the JavaScript Date object to convert
 * @return {java.time.Instant} instant instance at the given point in time
 * @see <a href="https://docs.oracle.com/javase/8/docs/api/java/time/package-summary.html">java.time</a>
 */
exports.toInstant = (date) => {
    return java.time.Instant.ofEpochMilli(date.getTime());
};

/**
 * Converts the given date to a <code>java.time.OffsetDateTime</code> instance using the date's offset.
 * Helps to interact with the <code>java.time</code> API for dates, times, and durations.
 *
 * @param date {Date} the JavaScript Date object to convert
 * @return {java.time.OffsetDateTime} time instance with offset representing the given date
 * @see <a href="https://docs.oracle.com/javase/8/docs/api/java/time/package-summary.html">java.time</a>
 */
exports.toOffsetDateTime = (date) => {
    return Instant.ofEpochMilli(date.getTime()).atOffset(
        ZoneOffset.ofTotalSeconds(date.getTimezoneOffset() * -60)
    );
};
