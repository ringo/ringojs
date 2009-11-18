/**
 * @fileoverview Adds useful methods to the JS Number type.
 */

module.shared = true;

/**
 * Format a number using java.text.DecimalFormat.
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
        return df.format(0 + this); // addition with 0 prevents exception
    }
});

/**
 * Invoke a function n times with n the value of this number.
 */
Object.defineProperty(Number.prototype, 'times', {
    value: function(fun) {
        for (var i = 0; i < this; i++) {
            fun(i);
        }
    }
});
