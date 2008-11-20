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

Object.defineProperty(Number.prototype, 'millis', {
    value: function() {
        return this;
    }
});

Object.defineProperty(Number.prototype, 'seconds', {
    value: function() {
        return this * 1000;
    }
});

Object.defineProperty(Number.prototype, 'minutes', {
    value: function() {
        return this * 60000;
    }
});

Object.defineProperty(Number.prototype, 'hours', {
    value: function() {
        return this * 3600000;
    }
});

Object.defineProperty(Number.prototype, 'days', {
    value: function() {
        return this * 86400000;
    }
});

Object.defineProperty(Number.prototype, 'weeks', {
    value: function() {
        return this * 604800000;
    }
});

Object.defineProperty(Number.prototype, 'months', {
    value: function() {
        return this * 2592000000;
    }
});

Object.defineProperty(Number.prototype, 'years', {
    value: function() {
        return this * 31536000000;
    }
});


Object.defineProperty(Number.prototype, 'inMillis', {
    value: function() {
        return this;
    }
});

Object.defineProperty(Number.prototype, 'inSeconds', {
    value: function() {
        return this / 1000;
    }
});

Object.defineProperty(Number.prototype, 'inMinutes', {
    value: function() {
        return this / 60000;
    }
});

Object.defineProperty(Number.prototype, 'inHours', {
    value: function() {
        return this / 3600000;
    }
});

Object.defineProperty(Number.prototype, 'inDays', {
    value: function() {
        return this / 86400000;
    }
});

Object.defineProperty(Number.prototype, 'inWeeks', {
    value: function() {
        return this / 604800000;
    }
});

Object.defineProperty(Number.prototype, 'inMonths', {
    value: function() {
        return this / 2592000000;
    }
});

Object.defineProperty(Number.prototype, 'inYears', {
    value: function() {
        return this / 31536000000;
    }
});


Object.defineProperty(Number.prototype, 'ago', {
    value: function() {
        return new Date(Date.now() - this);
    }
});

Object.defineProperty(Number.prototype, 'fromNow', {
    value: function() {
        return new Date(Date.now() + this);
    }
});

Object.defineProperty(Number.prototype, 'before', {
    value: function(date) {
        return new Date(date.getTime() - this);
    }
});

Object.defineProperty(Number.prototype, 'after', {
    value: function(date) {
        return new Date(date.getTime() + this);
    }
});


Object.defineProperty(Number.prototype, 'times', {
    value: function(fun) {
        for (var i = 0; i < this; i++) {
            fun(i);
        }
    }
});
