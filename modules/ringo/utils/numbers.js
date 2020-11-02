/**
 * @fileoverview Provides utility functions for working with JavaScript numbers.
 */

/**
 * Format `number` using java.text.DecimalFormat.
 * @param {Number} number the number
 * @param {String} fmt the format to apply
 * @param {java.util.Locale} locale optional locale
 * @returns {String} the number formatted as string
 * @see <a href="http://docs.oracle.com/javase/8/docs/api/java/text/DecimalFormat.html">java.text.DecimalFormat</a>
 * @example >> var numbers = require('ringo/utils/numbers');
 * >> numbers.format(123, "#,###,##0.00"); // uses the default locale
 * '123.00'
 * >> numbers.format(123, "#,###,##0.00", java.util.Locale.GERMAN);
 * '123,00'
 * >> numbers.format(123, "#,###,##0.00", java.util.Locale.ENGLISH);
 * '123.00'
 */
exports.format = (number, fmt, locale) => {
    const symbols = (locale != null) ?
        new java.text.DecimalFormatSymbols(locale) :
        new java.text.DecimalFormatSymbols();
    const df = new java.text.DecimalFormat(fmt || "###,##0.##", symbols);
    return df.format(+number);
};

/**
 * Invoke a function `num` times, passing 0 .. (this - 1) as argument.
 * @param {Number} num the number
 * @param {Function} fun the function to call
 * @example var numbers = require('ringo/utils/numbers');
 * numbers.times(5, function(i) {
 *   console.log("#" + i);
 * });
 */
exports.times = (num, fun) => {
    for (let i = 0; i < num; i++) {
        fun(i);
    }
};
