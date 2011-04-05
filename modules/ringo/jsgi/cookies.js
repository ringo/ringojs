/**
 * @fileOverview Utility functions to handle HTTP cookies.
 */

var {Buffer} = require('ringo/buffer');
var dates = require('ringo/utils/dates');

/**
 * Sets a cookie to be sent to the client.
 * All arguments except for key and value are optional.
 * The days argument specifies the number of days until the cookie expires.
 * To delete a cookie immediately, set the days argument to 0. If days is
 * undefined or negative, the cookie is set for the current browser session.
 *
 * @example <pre>res.setCookie("username", "michi");
 * res.setCookie("password", "strenggeheim", 10,
 * {path: "/mypath", domain: ".mydomain.org"});</pre>
 *
 * @param {String} key the cookie name
 * @param {String} value the cookie value
 * @param {Number} days optional the number of days to keep the cookie.
 * If this is undefined or -1, the cookie is set for the current session.
 * If this is 0, the cookie will be deleted immediately.
 * @param {Object} options optional options argument which may contain the following properties:
 * <ul><li>path - the path on which to set the cookie (defaults to /)</li>
 * <li>domain - the domain on which to set the cookie (defaults to current domain)</li>
 * <li>secure - to only use this cookie for secure connections</li>
 * <li>httpOnly - to make the cookie inaccessible to client side scripts</li></ul>
 * @since 0.5
 * @return {Response} this response object for chainability;
 */
exports.setCookie = function(key, value, days, options) {
    if (value) {
        // remove newline chars to prevent response splitting attack as value may be user-provided
        value = value.replace(/[\r\n]/g, "");
    }
    var buffer = new Buffer(key, "=", value);
    if (typeof days == "number" && days > -1) {
        var expires = days == 0 ?
                new Date(0) : new Date(Date.now() + days * 1000 * 60 * 60 * 24);
        var cookieDateFormat = "EEE, dd-MMM-yyyy HH:mm:ss zzz";
        buffer.write("; expires=");
        buffer.write(dates.format(expires, cookieDateFormat, "en", "GMT"));
    }
    options = options || {};
    var path = options.path || "/";
    buffer.write("; path=", encodeURI(path));
    if (options.domain) {
        buffer.write("; domain=", options.domain.toLowerCase());
    }
    if (options.secure) {
        buffer.write("; secure");
    }
    if (options.httpOnly) {
        buffer.write("; HttpOnly");
    }
    return buffer.toString();
};