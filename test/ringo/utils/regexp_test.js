var assert = require("assert");
var regexp = require("ringo/utils/regexp");

var STR = "[]{}()-*+?.\\^$|#, ABC";
var ESC = "\\[\\]\\{\\}\\(\\)\\-\\*\\+\\?\\.\\\\\\^\\$\\|\\#\\,\\ ABC";

exports.testRegexpEscape = function() {
    assert.equal(ESC, regexp.escape(STR));
    assert.isTrue(new RegExp(regexp.escape(STR)).test(STR));
};