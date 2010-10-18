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

export( "format",
        "add",
        "isLeapYear",
        "before",
        "after",
        "firstDayOfWeek",
        "secondOfDay",
        "dayOfYear",
        "weekOfMonth",
        "weekOfYear",
        "quarterOfYear",
        "yearInCentury",
        "daysInMonth",
        "daysInYear",
        "diff",
        "overlapping",
        "inPeriod",
        "resetTime",
        "resetDate" );

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

// Helper
function createGregorianCalender(date) {
    var cal = new java.util.GregorianCalendar();
    cal.setTimeInMillis(date.getTime());
    return cal;
}

function add(date, amount, unit) {
    var cal = createGregorianCalender(date),
    amount = amount || 0,
    unit = unit || "day";
    
    switch (unit) {
        case "year":    cal.add(java.util.Calendar.YEAR, amount);
                        break;
        case "quarter": cal.add(java.util.Calendar.MONTH, amount * 3);
                        break;
        case "month":   cal.add(java.util.Calendar.MONTH, amount);
                        break;
        case "week":    cal.add(java.util.Calendar.WEEK_OF_YEAR, amount);
                        break;
        case "day":     cal.add(java.util.Calendar.DATE, amount);
                        break;
        case "hour":    cal.add(java.util.Calendar.HOUR, amount);
                        break;
        case "minute":  cal.add(java.util.Calendar.MINUTE, amount);
                        break;
        case "second":  cal.add(java.util.Calendar.SECOND, amount);
                        break;
        case "millisecond":
                        return new Date(date.getTime() + amount);
    }
    return new Date(cal.getTimeInMillis());
}

function roll(date, amount, unit) {
    var cal = createGregorianCalender(date),
    amount = amount || 0,
    unit = unit || "day";
    
    switch (unit) {
        case "year":    cal.roll(java.util.Calendar.YEAR, amount);
                        break;
        case "quarter": cal.roll(java.util.Calendar.MONTH, amount * 3);
                        break;
        case "month":   cal.roll(java.util.Calendar.MONTH, amount);
                        break;
        case "week":    cal.roll(java.util.Calendar.WEEK_OF_YEAR, amount);
                        break;
        case "day":     cal.roll(java.util.Calendar.DATE, amount);
                        break;
        case "hour":    cal.roll(java.util.Calendar.HOUR, amount);
                        break;
        case "minute":  cal.roll(java.util.Calendar.MINUTE, amount);
                        break;
        case "second":  cal.roll(java.util.Calendar.SECOND, amount);
                        break;
        case "millisecond":
                        return new Date(date.getTime() + amount);
    }
    return new Date(cal.getTimeInMillis());
}

function isLeapYear(date) {
    return (new java.util.GregorianCalendar()).isLeapYear(date.getFullYear());
}

function before(a, b) {
    var calA = new java.util.GregorianCalendar(),
    calB = new java.util.GregorianCalendar();
    
    calA.setTimeInMillis(a.getTime());
    calB.setTimeInMillis(b.getTime());
    
    return calA.before(calB);
}

function after(a, b) {
    var calA = createGregorianCalender(a),
    calB = createGregorianCalender(b);
    
    return calA.after(calB);
}

function firstDayOfWeek(locale) {
    if (typeof locale == "string") {
        locale = new java.util.Locale(locale);
    }
    var calendar = locale ? java.util.Calendar.getInstance(locale) : java.util.Calendar.getInstance();
    return calendar.getFirstDayOfWeek();
}

function secondOfDay(date) {
    return (date.getHours() * 3600) + (date.getMinutes() * 60) + date.getSeconds();
}

function dayOfYear(date) {
    return createGregorianCalender(date).get(java.util.Calendar.DAY_OF_YEAR);
}

function weekOfMonth(date) {
    return createGregorianCalender(date).get(java.util.Calendar.WEEK_OF_MONTH);
}

function weekOfYear(date) {
    return createGregorianCalender(date).get(java.util.Calendar.WEEK_OF_YEAR);
}

function yearInCentury(date) {
    var year = date.getFullYear();
    return year - (Math.floor(year / 100) * 100);
}

function daysInMonth(date) {
    return createGregorianCalender(date).getActualMaximum(java.util.Calendar.DAY_OF_MONTH);
}

function daysInYear(date) {
    return createGregorianCalender(date).getActualMaximum(java.util.Calendar.DAY_OF_YEAR);
}

function quarterOfYear(date) {
    return Math.floor((date.getMonth() / 3) + 1);
}

function diff(a, b, unit) {
    var unit = unit || "day",
    mDiff = Math.abs(a.getTime() - b.getTime()),
    yDiff = Math.abs(a.getFullYear() - b.getFullYear()),
    delta = mDiff;
       
    switch (unit) {
        case "year":    delta = yDiff; // just return the yDiff
                        break;
        case "quarter": delta = (yDiff * 4) + Math.abs(quarterOfYear(a) - quarterOfYear(b));
                        break;
        case "month":   delta = (yDiff * 12) + Math.abs(a.getMonth() - b.getMonth());
                        break;
        case "week":    delta = Math.floor(diff(a, b, "day") / 7);
                        break;
        case "day":     delta /= 24;
        case "hour":    delta /= 60;
        case "minute":  delta /= 60;
        case "second":  delta /= 1000;
                        break;
        case "millisecond":
                        break; // delta is by default the diff in millis
    }
    
    return delta;
}

// By Dominik Gruber, written for Tenez.at
function overlapping(aStart, aEnd, bStart, bEnd) {
    var aStart = aStart.getTime(),
        aEnd   = aEnd.getTime(),
        bStart = bStart.getTime(),
        bEnd   = bEnd.getTime();
        
        // A     |----|
        // B  |----|
        if(aStart >= bStart && aStart <= bEnd && aEnd >= bStart && aEnd >= bEnd) {
            return true;
        }

        // A  |----|
        // B    |----|
        if(aStart <= bStart && aStart <= bEnd && aEnd >= bStart && aEnd <= bEnd) {
            return true;
        }

        // A  |-------|
        // B    |--|
        if(aStart <= bStart && aStart <= bEnd && aEnd >= bStart && aEnd >= bEnd) {
            return true;
        }

        // A    |--|
        // B  |-------|
        if(aStart >= bStart && aStart <= bEnd && aEnd >= bStart && aEnd <= bEnd) {
            return true;
        }
        
        return false;
}

function inPeriod(date, periodStart, periodEnd) {
    var pStart = periodStart.getTime(),
    pEnd = periodEnd.getTime(),
    dateMillis = date.getTime();
    
    // period  |-------|
    // date       ^
    if(pStart <= dateMillis && dateMillis <= pEnd) {
        return true;
    }
    
    return false;
}

function resetTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function resetDate(date) {
    return new Date(1970, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}