/**
 * Time unit conversion utility methods.
 *
 *   (5).minutes()
 *   300000
 *
 *   (5).minutes().inSeconds()
 *   300
 *
 *   (5).minutes().ago()
 *   Fri Oct 31 2008 12:54:31 GMT+0100 (MEZ)
 *
 *   (5).minutes().fromNow()
 *   Fri Oct 31 2008 13:04:34 GMT+0100 (MEZ)
 */

Number.prototype.__defineProperty__('millis', function() {
    return this;
}, false, false, true);

Number.prototype.__defineProperty__('seconds', function() {
    return this * 1000;
}, false, false, true);

Number.prototype.__defineProperty__('minutes', function() {
    return this * 60000;
}, false, false, true);

Number.prototype.__defineProperty__('hours', function() {
    return this * 3600000;
}, false, false, true);

Number.prototype.__defineProperty__('days', function() {
    return this * 86400000;
}, false, false, true);

Number.prototype.__defineProperty__('weeks', function() {
    return this * 604800000;
}, false, false, true);

Number.prototype.__defineProperty__('months', function() {
    return this * 2592000000;
}, false, false, true);

Number.prototype.__defineProperty__('years', function() {
    return this * 31536000000;
}, false, false, true);


Number.prototype.__defineProperty__('inMillis', function() {
    return this;
}, false, false, true);

Number.prototype.__defineProperty__('inSeconds', function() {
    return this / 1000;
}, false, false, true);

Number.prototype.__defineProperty__('inMinutes', function() {
    return this / 60000;
}, false, false, true);

Number.prototype.__defineProperty__('inHours', function() {
    return this / 3600000;
}, false, false, true);

Number.prototype.__defineProperty__('inDays', function() {
    return this / 86400000;
}, false, false, true);

Number.prototype.__defineProperty__('inWeeks', function() {
    return this / 604800000;
}, false, false, true);

Number.prototype.__defineProperty__('inMonths', function() {
    return this / 2592000000;
}, false, false, true);

Number.prototype.__defineProperty__('inYears', function() {
    return this / 31536000000;
}, false, false, true);


Number.prototype.__defineProperty__('ago', function() {
    return new Date(Date.now() - this);
}, false, false, true);

Number.prototype.__defineProperty__('fromNow', function() {
    return new Date(Date.now() + this);
}, false, false, true);

Number.prototype.__defineProperty__('before', function(date) {
    return new Date(date.getTime() - this);
}, false, false, true);

Number.prototype.__defineProperty__('after', function(date) {
    return new Date(date.getTime() + this);
}, false, false, true);


Number.prototype.__defineProperty__('times', function(fun) {
    for (var i = 0; i < this; i++) {
        fun(i);
    }
}, false, false, true);
