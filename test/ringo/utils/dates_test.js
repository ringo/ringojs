var assert = require('assert');
var dates = require('ringo/utils/dates');
var log = require('ringo/logging').getLogger(module.id);

// list of years taken from http://en.wikipedia.org/wiki/List_of_leap_years
exports.testIsLeapYear = function () {
    var leapYears = [
        1896, 1904, 1908, 1912, 1916, 1920,
        1924, 1928, 1932, 1936, 1940, 1944,
        1948, 1952, 1956, 1960, 1964, 1968,
        1972, 1976, 1980, 1984, 1988, 1992,
        1996, 2000, 2004, 2008, 2012, 2016,
        2020, 2024, 2028, 2032, 2036, 2040,
        2400, 2800
    ],
    noLeapYears = [
        1700, 1800, 1900, 2001, 2002, 2003,
        2005, 2006, 2007, 2100, 2200, 2300,
        2301, 2500, 2600, 2700, 2900, 3000
    ];
    
    leapYears.forEach(function(year) {
        var d = new Date(year, 0, 1);
        assert.isTrue(dates.isLeapYear(d));
        assert.equal(dates.daysInYear(d), 366);
        assert.equal(dates.daysInFebruary(d), 29);
    });
    
    noLeapYears.forEach(function(year) {
        var d = new Date(year, 0, 1);
        assert.isFalse(dates.isLeapYear(d));
        assert.equal(dates.daysInYear(d), 365);
        assert.equal(dates.daysInFebruary(d), 28);
    });
};

exports.testAddTimeToDate = function () {
    var d = new Date(2010, 10, 10, 10, 10, 10, 10);
    assert.equal(d.getTime(), 1289380210010); // Wed Nov 10 2010 10:10:10 GMT+0100 (MEZ)
    
    // Add 10
    assert.equal(dates.add(d, 10, 'millisecond').getTime(), 1289380210020);
    assert.equal(dates.add(d, 10, 'second').getTime(), 1289380220010); // Wed Nov 10 2010 10:10:20 GMT+0100 (MEZ)
    assert.equal(dates.add(d, 10, 'minute').getTime(), 1289380810010); // Wed Nov 10 2010 10:20:10 GMT+0100 (MEZ)
    assert.equal(dates.add(d, 10, 'hour').getTime(), 1289416210010); // Wed Nov 10 2010 20:10:10 GMT+0100 (MEZ)
    
    assert.equal(dates.add(d, 10, 'day').getTime(), 1290244210010); // Sat Nov 20 2010 10:10:10 GMT+0100 (MEZ)
    assert.equal(dates.add(d, 10).getTime(), 1290244210010); // Sat Nov 20 2010 10:10:10 GMT+0100 (MEZ)
    
    assert.equal(dates.add(d, 10, 'week').getTime(), 1295428210010); // Wed Jan 19 2011 10:10:10 GMT+0100 (MEZ)
    assert.equal(dates.add(d, 10, 'month').getTime(), 1315642210010); // Sat Sep 10 2011 10:10:10 GMT+0200 (MESZ)
    assert.equal(dates.add(d, 10, 'quarter').getTime(), 1368173410010); // Fri May 10 2013 10:10:10 GMT+0200 (MESZ)
    assert.equal(dates.add(d, 10, 'year').getTime(), 1604999410010); // Tue Nov 10 2020 10:10:10 GMT+0100 (MEZ)
   
    // Add nothing
    assert.equal(dates.add(d, 0, 'millisecond').getTime(), 1289380210010);
    assert.equal(dates.add(d, 0, 'second').getTime(), 1289380210010);
    assert.equal(dates.add(d, 0, 'minute').getTime(), 1289380210010);
    assert.equal(dates.add(d, 0, 'hour').getTime(), 1289380210010);
    
    assert.equal(dates.add(d, 0, 'day').getTime(), 1289380210010);
    assert.equal(dates.add(d, 0).getTime(), 1289380210010);
    
    assert.equal(dates.add(d, 0, 'week').getTime(), 1289380210010);
    assert.equal(dates.add(d, 0, 'month').getTime(), 1289380210010);
    assert.equal(dates.add(d, 0, 'quarter').getTime(), 1289380210010);
    assert.equal(dates.add(d, 0, 'year').getTime(), 1289380210010);
    
    // Remove 10
    assert.equal(dates.add(d, -10, 'millisecond').getTime(), 1289380210000);
    assert.equal(dates.add(d, -10, 'second').getTime(), 1289380200010); // Wed Nov 10 2010 10:10:00 GMT+0100 (MEZ)
    assert.equal(dates.add(d, -10, 'minute').getTime(), 1289379610010); // Wed Nov 10 2010 10:00:10 GMT+0100 (MEZ)
    assert.equal(dates.add(d, -10, 'hour').getTime(), 1289344210010); // Wed Nov 10 2010 00:10:10 GMT+0100 (MEZ)
    
    assert.equal(dates.add(d, -10, 'day').getTime(), 1288516210010); // Sun Oct 31 2010 10:10:10 GMT+0100 (MEZ)
    assert.equal(dates.add(d, -10).getTime(), 1288516210010);
    
    assert.equal(dates.add(d, -10, 'week').getTime(), 1283328610010); // Wed Sep 01 2010 10:10:10 GMT+0200 (MESZ) 
    assert.equal(dates.add(d, -10, 'month').getTime(), 1263114610010); // Sun Jan 10 2010 10:10:10 GMT+0100 (MEZ)
    assert.equal(dates.add(d, -10, 'quarter').getTime(), 1210407010010); // Sat May 10 2008 10:10:10 GMT+0200 (MESZ)
    assert.equal(dates.add(d, -10, 'year').getTime(), 973847410010); // Fri Nov 10 2000 10:10:10 GMT+0100 (MEZ)
};

exports.testBeforeAfterCompareTo = function () {
    var a = new Date(2010, 0, 2), b = new Date(2010, 0, 1);
    
    assert.isFalse(dates.before(a, b));
    assert.isTrue(dates.after(a, b));
    assert.equal(dates.compare(a, b), 1);
    
    a = new Date(2010, 0, 1);
    b = new Date(2010, 0, 2);
    assert.isTrue(dates.before(a, b));
    assert.isFalse(dates.after(a, b));
    assert.equal(dates.compare(a, b), -1);
    
    a = new Date(2010, 0, 1);
    b = new Date(2010, 0, 1);
    assert.isFalse(dates.before(a, b));
    assert.isFalse(dates.after(a, b));
    assert.equal(dates.compare(a, b), 0);
    
    a = new Date(2008, 1, 29);
    b = new Date(2008, 1, 29);
    assert.isFalse(dates.before(a, b));
    assert.isFalse(dates.after(a, b));
    assert.equal(dates.compare(a, b), 0);
    
    a = new Date(2000, 1, 29);
    b = new Date(2008, 1, 29);
    assert.isTrue(dates.before(a, b));
    assert.isFalse(dates.after(a, b));
    assert.equal(dates.compare(a, b), -1);
};

exports.testFirstDayOfWeek = function () {
    assert.equal(dates.firstDayOfWeek("de"), 2);
    assert.equal(dates.firstDayOfWeek("us"), 1);
    
    assert.equal(dates.firstDayOfWeek(java.util.Locale.GERMANY), 2);
    assert.equal(dates.firstDayOfWeek(java.util.Locale.US), 1);
};

exports.testQuarterInYear = function() {
    assert.equal(dates.quarterInYear(new Date(2010, 0, 1)), 1);
    assert.equal(dates.quarterInYear(new Date(2010, 3, 1)), 2);
    assert.equal(dates.quarterInYear(new Date(2010, 6, 1)), 3);
    assert.equal(dates.quarterInYear(new Date(2010, 9, 1)), 4);
    
    assert.equal(dates.quarterInYear(new Date(2010, 1, 1)), 1);
    assert.equal(dates.quarterInYear(new Date(2010, 4, 1)), 2);
    assert.equal(dates.quarterInYear(new Date(2010, 7, 1)), 3);
    assert.equal(dates.quarterInYear(new Date(2010, 10, 1)), 4);
    
    assert.equal(dates.quarterInYear(new Date(2010, 2, 1)), 1);
    assert.equal(dates.quarterInYear(new Date(2010, 5, 1)), 2);
    assert.equal(dates.quarterInYear(new Date(2010, 8, 1)), 3);
    assert.equal(dates.quarterInYear(new Date(2010, 11, 1)), 4);
    
    assert.equal(dates.quarterInYear(new Date(2010, 2, 31)), 1);
    assert.equal(dates.quarterInYear(new Date(2010, 5, 30)), 2);
    assert.equal(dates.quarterInYear(new Date(2010, 8, 30)), 3);
    assert.equal(dates.quarterInYear(new Date(2010, 11, 31)), 4);
}

exports.testQuarterInFiscalYear = function() {
    // UK tax year
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 0, 6), new Date(1990, 3, 6)), 4);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 3, 6), new Date(1990, 3, 6)), 1);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 6, 6), new Date(1990, 3, 6)), 2);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 9, 6), new Date(1990, 3, 6)), 3);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 3, 5, 23, 59, 59), new Date(1990, 3, 6)), 4);
    
    // With standard year starting on 01/01
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 0, 1), new Date(1970, 0, 1)), 1);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 3, 1), new Date(1970, 0, 1)), 2);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 6, 1), new Date(1970, 0, 1)), 3);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 9, 1), new Date(1970, 0, 1)), 4);
    
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 1, 1), new Date(1970, 0, 1)), 1);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 4, 1), new Date(1970, 0, 1)), 2);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 7, 1), new Date(1970, 0, 1)), 3);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 10, 1), new Date(1970, 0, 1)), 4);
    
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 2, 1), new Date(1970, 0, 1)), 1);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 5, 1), new Date(1970, 0, 1)), 2);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 8, 1), new Date(1970, 0, 1)), 3);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 11, 1), new Date(1970, 0, 1)), 4);
    
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 2, 31), new Date(1970, 0, 1)), 1);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 5, 30), new Date(1970, 0, 1)), 2);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 8, 30), new Date(1970, 0, 1)), 3);
    assert.equal(dates.quarterInFiscalYear(new Date(2010, 11, 31), new Date(1970, 0, 1)), 4);
};