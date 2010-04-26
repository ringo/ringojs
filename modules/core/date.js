/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 *
 * Copyright 1998-2005 Helma Software. All Rights Reserved.
 *
 * $RCSfile: Date.js,v $
 * $Author: zumbrunn $
 * $Revision: 8716 $
 * $Date: 2007-12-13 19:25:41 +0100 (Don, 13 Dez 2007) $
 */

module.shared = true;

/**
 * @fileoverview Adds useful methods to the JavaScript Date type.
 */


Date.ONESECOND    = 1000;
Date.ONEMINUTE    = 60 * Date.ONESECOND;
Date.ONEHOUR      = 60 * Date.ONEMINUTE;
Date.ONEDAY       = 24 * Date.ONEHOUR;
Date.ONEWEEK      =  7 * Date.ONEDAY;
Date.ONEMONTH     = 30 * Date.ONEDAY;
Date.ONEYEAR      = 12 * Date.ONEMONTH;
Date.ISOFORMAT    = "yyyy-MM-dd'T'HH:mm:ss'Z'";


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
Object.defineProperty(Date.prototype, "format", {
    value: function (format, locale, timezone) {
        if (!format)
            return this.toString();
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
        return sdf.format(this);
    }, writable: true
});


/** 
 * set the date/time to UTC by subtracting
 * the timezone offset
 */ 
Object.defineProperty(Date.prototype, "toUtc", {
    value: function() {
        this.setMinutes(this.getMinutes() + this.getTimezoneOffset());
    }, writable: true
});

/** 
 * set the date/time to local time by adding
 * the timezone offset
 */ 
Object.defineProperty(Date.prototype, "toLocalTime", {
    value: function() {
        this.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    }, writable: true
});


/**
 * returns the difference between this and another
 * date object in milliseconds
 */
Object.defineProperty(Date.prototype, "diff", {
    value: function(dateObj) {
        return this.getTime() - dateObj.getTime();
    }, writable: true
});


/**
 * return the timespan to current date/time or a different Date object
 * @param Object parameter object containing optional properties:
 *        .now = String to use if difference is < 1 minute
 *        .day|days = String to use for single|multiple day(s)
 *        .hour|hours = String to use for single|multiple hour(s)
 *        .minute|minutes = String to use for single|multiple minute(s)
 *        .date = Date object to use for calculating the timespan
 * @returns Object containing properties:
 *         .isFuture = (Boolean)
 *         .span = (String) timespan
 * @see Date.prototype.getAge
 * @see Date.prototype.getExpiry
 */
Object.defineProperty(Date.prototype, "getTimespan", {
    value: function(param) {
        if (!param)
            param = {date: new Date()};
        else if (!param.date)
            param.date = new Date();

        var result = {isFuture: this > param.date};
        var diff = Math.abs(param.date.diff(this));
        var age = {days: Math.floor(diff / Date.ONEDAY),
                   hours: Math.floor((diff % Date.ONEDAY) / Date.ONEHOUR),
                   minutes: Math.floor((diff % Date.ONEHOUR) / Date.ONEMINUTE)};

        res.push();
        if (diff < Date.ONEMINUTE)
            res.write(param.now || "now");
        else {
            var arr = [{one: "day", many: "days"},
                       {one: "hour", many: "hours"},
                       {one: "minute", many: "minutes"}];
            for (var i in arr) {
                var value = age[arr[i].many];
                if (value != 0) {
                    var prop = (value == 1 ? arr[i].one : arr[i].many);
                    res.write(value);
                    res.write(" ");
                    res.write(param[prop] || prop);
                    if (i < arr.length -1)
                        res.write(param.delimiter || ", ");
                }
            }
        }
        result.span = res.pop();
        return result;
    }, writable: true
});


/**
 * return the past timespan between this Date object and
 * the current Date or a different Date object
 * @see Date.prototype.getTimespan
 */
Object.defineProperty(Date.prototype, "getAge", {
    value: function(param) {
        var age = this.getTimespan(param);
        if (!age.isFuture)
            return age.span;
        return null;
    }, writable: true
});


/**
 * return the future timespan between this Date object and
 * the current Date or a different Date object
 * @see Date.prototype.getTimespan
 */
Object.defineProperty(Date.prototype, "getExpiry", {
        value: function(param) {
        var age = this.getTimespan(param);
        if (age.isFuture)
            return age.span;
        return null;
    }, writable: true
});


/**
 * checks if a date object equals another date object
 * @param Object Date object to compare
 * @param Int indicating how far the comparison should go
 * @returns Boolean
 */
Object.defineProperty(Date.prototype, "equals", {
    value: function(date, extend) {
        if (!extend)
            extend = Date.ONEDAY;
        switch (extend) {
            case Date.ONESECOND:
                if (this.getSeconds() != date.getSeconds())
                    return false;
            case Date.ONEMINUTE:
                if (this.getMinutes() != date.getMinutes())
                    return false;
            case Date.ONEHOUR:
                if (this.getHours() != date.getHours())
                    return false;
            case Date.ONEDAY:
                if (this.getDate() != date.getDate())
                    return false;
            case Date.ONEMONTH:
                if (this.getMonth() != date.getMonth())
                    return false;
            case Date.ONEYEAR:
                if (this.getFullYear() != date.getFullYear())
                    return false;
        }
        return true;
    }, writable: true
});

