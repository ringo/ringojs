/**
 * @fileoverview Adds useful methods to the JS Number type.
 */

/**
 * Format a number using java.text.DecimalFormat.
 * @param fmt the format to apply
 * @param locale optional locale
 * @returns the number formatted as string
 */
Object.defineProperty(Number.prototype, 'format', {
    value: function(fmt, locale) {
        var symbols;
        if (locale != null) {
            symbols = new java.text.DecimalFormatSymbols(locale);
        } else {
            symbols = new java.text.DecimalFormatSymbols();
        }
        var df = new java.text.DecimalFormat(fmt || "###,##0.##", symbols);
        return df.format(+this);
    }, writable: true
});

/**
 * Invoke a function this times, passing 0 .. this - 1 as argument.
 * @param {Function} fun the function to call
 */
Object.defineProperty(Number.prototype, 'times', {
    value: function(fun) {
        for (var i = 0; i < this; i++) {
            fun(i);
        }
    }, writable: true
});
