// Originally from narwhal

module.shared = true;

/**
 * Accepts a string; returns the string with regex metacharacters escaped.
 * the returned string can safely be used within a regex to match a literal
 * string. escaped characters are \[, ], {, }, (, ), -, *, +, ?, ., \, ^, $,
 * |, #, \[comma], and whitespace.
 * @param {String} str the string to escape
 * @returns {String} the escaped string
 */
Object.defineProperty(RegExp, 'escape', {
    value:  function (str) {
        return str.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, "\\$&");
    }, writable: true
});

